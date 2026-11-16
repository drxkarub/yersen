# Faz 1 Veritabanı ve Puan Kuralları — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faz 1'in veri katmanı: şema ve migration, menüyü idempotent kaydetme, kaydırma ve puanlama kuralları, oran sınırı. Hepsi gerçek Postgres (PGlite) üzerinde testli.

**Architecture:** Şema `api/src/db/schema.ts` içinde Drizzle ile tanımlanır, migration `drizzle-kit generate` ile üretilir. İş kuralları HTTP'den bağımsız servis fonksiyonlarıdır (`api/src/domain/*`). Hepsi `Db` ve açık bir `now: Date` alır, böylece zaman testlenebilir olur. Kurallar API katmanında uygulanır, tekillik ve aralık kısıtları ise veritabanında ikinci kez güvenceye alınır. HTTP rotaları bu planda yok, giriş (Better Auth) planıyla gelecek.

**Tech Stack:** Drizzle ORM 0.45, drizzle-kit 0.31, PGlite 0.5 (testlerde), PostgreSQL 17 (üretimde), Vitest 5.

**Spec:** `CLAUDE.md` ("Kaydırma ve puanlama", "Veri modeli taslağı", "Eşleşme anahtarı") ve `TODO.md` Faz 1 "Veritabanı ve yetki".

## Global Constraints

- Puan 1-10 arasında bir tam sayıdır. Kullanıcı başına, yemek başına, gün başına tek puan (`user + dish + date` tekil). Puan, pencere açıkken değiştirilebilir.
- Puanlama penceresi: menü günü 11:30'dan ertesi gün 11:30'a kadar, saat dilimi Europe/Istanbul (sabit UTC+3).
- O gün yalnızca "yerim" ya da "belki" diyenler puanlayabilir. "Yemem" diyen kişi önce kararını değiştirmelidir. Kaydırmamış kullanıcı puan verirse kaydırması otomatik olarak "yerim" yazılır.
- Kaydırma, ancak menü günü bugün ya da gelecekteyse yapılabilir veya değiştirilebilir.
- Oran sınırı: kullanıcı başına saatte en fazla 300 kaydırma ve 60 puan yazımı.
- Banlı kullanıcı (`banned_at` dolu) hiçbir şey yazamaz.
- Yemek eşleşmesi `dishKey()` (`@yersen/shared`) ile yapılır. Gösterilen ad menüdeki hamdır.
- Gelecek için veri modeli açık bırakılır: `meal_slot`, `menu.status`, `menu.source`, `dish.owner_venue_id`, `profile.residence_venue_id`, `rating.residence_tag`.
- Sunucu UTC'de çalışır. "Bugün" her zaman İstanbul saatiyle hesaplanır.

## Review Focus

1. **Gece yarısı saat dilimi:** UTC 21:00-24:00 arası, İstanbul'da ertesi gündür. "Bugün" ve pencere hesapları buna uymalı (Task 2 testi).
2. **Okul menüyü sonradan değiştirir:** Aynı günün aynı sırasındaki yemek değişir. Kaydetme hata vermemeli, kalem yeni yemeğe dönmeli, eski puanlar eski yemekte kalmalı (Task 3 testi).
3. **Aynı gün aynı yemek iki kez yazılmış:** Tekillik kısıtına takılıp scraper'ı düşürmemeli, ilk geçen tutulmalı (Task 3 testi).
4. **Çift gönderim (ağ tekrarı):** Aynı puan iki kez gelirse tek satır kalmalı ve hata dönmemeli (Task 5 testi).
5. **Ondalıklı ya da aralık dışı puan:** 7.5, 0 ve 11 reddedilmeli. Veritabanı kısıtı da bunu tutmalı (Task 1 ve Task 5 testleri).

---

### Task 1: Şema, migration ve kısıtlar

**Files:**
- Modify: `api/src/db/schema.ts`
- Create: `api/drizzle/0001_*.sql` (drizzle-kit üretir), `api/drizzle/0002_seed_venue.sql` (custom)
- Test: `api/src/db/schema.test.ts`

**Interfaces:**
- Produces: Drizzle tabloları `venue`, `dish`, `menu`, `menuItem`, `profile`, `inviteCode`, `swipe`, `rating`, `rateEvent`; enum'lar `venueKind` (`cafeteria|dorm|place`), `mealSlot` (`daily|breakfast|dinner`), `menuStatus` (`published|pending`), `menuSource` (`scraper|user_upload|admin`), `role` (`user|moderator|admin`), `swipeChoice` (`yes|no|maybe`), `rateKind` (`swipe|rating`). Tohum verisi: `venue` satırı `slug = 'trakya-merkez'`, `kind = 'cafeteria'`, `name = 'Trakya Üniversitesi Merkez Kampüsler Yemekhanesi'`, `city = 'Edirne'`, `university = 'trakya'`.
- Kısıtlar:
  - `dish`: unique (`owner_venue_id`, `key`) NULLS NOT DISTINCT
  - `menu`: unique (`venue_id`, `date`, `meal_slot`)
  - `menu_item`: unique (`menu_id`, `position`) ve unique (`menu_id`, `dish_id`), menü silinince cascade
  - `profile`: `lower(nickname)` için unique index
  - `invite_code.used_by`: unique
  - `swipe`: pk (`user_id`, `menu_item_id`)
  - `rating`: unique (`user_id`, `dish_id`, `date`), check `score between 1 and 10`
  - `rate_event`: (`user_id`, `kind`, `at`) üzerinde index

- [ ] **Step 1: Write the failing test** `schema.test.ts`, `createTestDb()` ile:
  - `"tohum yemekhane satırı var"`: `select from venue where slug='trakya-merkez'` → 1 satır.
  - `"puan 1-10 dışında reddedilir"`: `score: 0` ve `score: 11` ile insert → rejects.
  - `"aynı kullanıcı-yemek-gün için ikinci puan reddedilir"`.
  - `"takma ad büyük/küçük harf duyarsız tekil"`: `"Burak"` sonra `"burak"` → rejects.
  - `"sahipsiz aynı anahtarlı iki yemek reddedilir"`: `owner_venue_id` null olan iki `dish` ve `key='etli nohut'` → rejects.
- [ ] **Step 2:** `npx vitest run api/src/db/schema.test.ts` → FAIL (tablolar yok).
- [ ] **Step 3:** Tabloları `schema.ts`'e yaz. `npm run db:generate -w api -- --name faz1_schema`, ardından `npx drizzle-kit generate --custom --name seed_venue` ve içine tohum `INSERT ... ON CONFLICT (slug) DO NOTHING` yazılır. NULLS NOT DISTINCT için `.nullsNotDistinct()` kullanılır. Kesirli puanı Task 5 servisi reddeder, kolon tipi `smallint`'tir.
- [ ] **Step 4:** Test → PASS. `npm test` (tümü) → PASS.
- [ ] **Step 5:** Commit: `Faz 1 şeması: menü, yemek, profil, davet, kaydırma, puan`.

### Task 2: İstanbul tarihi ve puanlama penceresi

**Files:**
- Create: `api/src/domain/time.ts`
- Test: `api/src/domain/time.test.ts`

**Interfaces:**
- Produces: `istanbulDate(now: Date): string` (YYYY-MM-DD), `ratingWindow(menuDate: string): { opensAt: Date; closesAt: Date }`, `isRatingOpen(menuDate: string, now: Date): boolean`.

- [ ] **Step 1: Failing tests:**
  - `istanbulDate(new Date("2026-11-16T22:30:00Z"))` → `"2026-11-17"`; `istanbulDate(new Date("2026-11-16T20:59:59Z"))` → `"2026-11-16"`.
  - `ratingWindow("2026-11-16")` → `opensAt = 2026-11-16T08:30:00Z`, `closesAt = 2026-11-17T08:30:00Z`.
  - `isRatingOpen("2026-11-16", …)`: `08:29:59Z` → false, `08:30:00Z` → true, ertesi gün `08:29:59Z` → true, ertesi gün `08:30:00Z` → false.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Türkiye 2016'dan beri yaz saati uygulamıyor, sabit `+03:00` ofseti yeterli. `istanbulDate` için `Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" })` kullanılır.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `İstanbul tarihi ve puanlama penceresi`.

### Task 3: Menüyü idempotent kaydetme

**Files:**
- Create: `api/src/domain/menuStore.ts`
- Modify: `api/package.json` (`"exports": { "./menu-store": "./src/domain/menuStore.ts", "./db": "./src/db/client.ts" }`). Scraper bunları kullanacak.
- Test: `api/src/domain/menuStore.test.ts`

**Interfaces:**
- Consumes: `MenuDay` tipi (`scraper/src/parse.ts`: `{ date: string; dishes: string[]; kcal: number | null }`). Döngüsel bağımlılık olmasın diye aynı yapı `api` içinde `StoredMenuDay` adıyla yeniden tanımlanır.
- Produces: `storeMenuDays(db: Db, venueSlug: string, days: StoredMenuDay[]): Promise<{ menus: number; items: number; newDishes: number }>`.

- [ ] **Step 1: Failing tests:**
  - `"ilk kayıt menü, kalem ve yemekleri oluşturur"`: 2 gün × 4 yemek → `menus: 2`, `items: 8`. Ortak yemek iki günde de geçiyorsa yemek bir kez oluşur.
  - `"aynı veriyle ikinci çalıştırma hiçbir şey çoğaltmaz"`: satır sayıları değişmez, `newDishes: 0`.
  - `"görünen ad menüdeki ham addır, anahtar dishKey'dir"`: `"PİRİNÇ PİLAVI"` → `display_name = "PİRİNÇ PİLAVI"`, `key = "pirinç pilavı"`.
  - `"okul menüyü değiştirirse kalem yeni yemeğe döner, eski puan eski yemekte kalır"` (Review Focus 2).
  - `"aynı gün iki kez yazılan yemek bir kez kaydedilir"` (Review Focus 3).
  - `"kalori güncellenir"`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Tek transaction içinde: venue bulunur (yoksa hata), her gün için `menu` upsert edilir (`meal_slot = 'daily'`, `source = 'scraper'`). Yemekler `dishKey` ile upsert edilir (`owner_venue_id` null). Kalemler (`menu_id`, `position`) üzerinden upsert edilir. Yeni listede olmayan pozisyonlar silinir, ama kaydırması olan kalemler silinmez, `position` alanı negatife alınarak korunur.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `Menüyü idempotent kaydetme`.

### Task 4: Oran sınırı

**Files:**
- Create: `api/src/domain/rateLimit.ts`
- Test: `api/src/domain/rateLimit.test.ts`

**Interfaces:**
- Produces: `RATE_LIMITS = { swipe: 300, rating: 60 }`, `consumeRate(db: Db | Tx, userId: string, kind: "swipe" | "rating", now: Date): Promise<boolean>`. Sınırın altındaysa olayı yazıp `true` döner, değilse yazmadan `false` döner.

- [ ] **Step 1: Failing tests:** 60 puan → hepsi `true`, 61. → `false`. 1 saat 1 saniye sonra → yine `true`. Kaydırma sınırı puan sınırından bağımsızdır.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: `now - 1 saat`'ten sonraki olaylar sayılır. Bir saatten eski olaylar aynı çağrıda silinir.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit: `Kullanıcı başına oran sınırı`.

### Task 5: Kaydırma ve puanlama servisleri

**Files:**
- Create: `api/src/domain/swipe.ts`, `api/src/domain/rating.ts`, `api/src/test/fixtures.ts` (test yardımcıları: profil ve menü oluşturma)
- Test: `api/src/domain/swipe.test.ts`, `api/src/domain/rating.test.ts`

**Interfaces:**
- Consumes: `istanbulDate`, `isRatingOpen` (Task 2), `consumeRate` (Task 4), `storeMenuDays` (Task 3; fixture'da).
- Produces:
  - `setSwipe(db, { userId: string; menuItemId: number; choice: "yes" | "no" | "maybe"; now: Date }): Promise<SwipeResult>`. `SwipeResult = { ok: true } | { ok: false; error: "not_found" | "banned" | "past_day" | "rate_limited" }`.
  - `rateDish(db, { userId: string; menuItemId: number; score: number; now: Date }): Promise<RateResult>`. `RateResult = { ok: true; ratingId: number } | { ok: false; error: "not_found" | "banned" | "invalid_score" | "window_closed" | "said_no" | "rate_limited" }`.

- [ ] **Step 1: Failing tests:**
  - **Kaydırma:**
    - Bugünün ve geleceğin kalemi → ok. Dünün kalemi → `past_day`.
    - Karar değiştirme tek satırı günceller.
    - Banlı kullanıcı → `banned`.
    - Olmayan kalem → `not_found`.
  - **Puanlama:**
    - Pencere içinde "yes" ya da "maybe" → ok. Pencere öncesi ve sonrası → `window_closed`.
    - "no" → `said_no`. "no"dan "yes"e çevrilince → ok.
    - Kaydırma yoksa → ok ve swipe "yes" olur.
    - `7.5`, `0`, `11` → `invalid_score`.
    - Aynı puanı iki kez göndermek → tek satır, ikinci de ok (Review Focus 4).
    - Puan değiştirmek güncellenir.
    - 61. puan → `rate_limited`.
    - Banlı → `banned`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Kontrol sırası: profil ve ban, kalem ve menü günü, puan doğrulama, pencere, kaydırma kontrolü, oran sınırı, upsert (`onConflictDoUpdate`, hedef `user_id, dish_id, date`). Hepsi tek transaction içinde. `rating.date` menünün tarihidir, `rating.menu_item_id` kaynağı gösterir.
- [ ] **Step 4:** Run → PASS. `npm test`, `npm run typecheck` → temiz.
- [ ] **Step 5:** Commit: `Kaydırma ve puanlama kuralları`. Push edilir ve CI ile watchtower'ın sunucuyu güncellediği doğrulanır (migration'lar API açılışında uygulanır).
