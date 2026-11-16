# yersen: TODO

Her madde küçük ve tek başına test edilebilir. Bitince `[x]` ile işaretle.

## Faz 0: Kurulum

- [x] Git reposunu kur, `.gitignore` ve `.env.example` dosyalarını ekle.
- [x] Monorepo iskeletini kur: `web/` (Vite + React + TS), `api/` (Hono + TS), `scraper/` ve ortak tipler için `shared/`. `npm run dev` hem ön yüzü hem API'yi açmalı.
- [x] Yerel veritabanı: `DATABASE_URL` boşsa API diskte PGlite kullanır (Docker gerekmez). `/health` 200 dönmeli.
- [x] Drizzle'ı kur ve ilk boş migration'ı çalıştır.
- [x] Test altyapısı: Vitest ve bellekte PGlite'a (gerçek Postgres) karşı çalışan entegrasyon testleri. `npm test` yerelde çalışıyor olmalı.
- [x] Üretim için `docker-compose.yml`: api ve Postgres. Bellek sınırları tanımlı olsun (Postgres 256 MB, API 192 MB), API sadece `127.0.0.1:3300`'e bağlansın, Postgres hiç port yayınlamasın. `ss -tlnp` ile doğrula.
- [x] Sunucuda `/opt/yersen` dizini (repo klonu, `.env` 600). Docker zaten kurulu, ufw'ye yeni kural eklenmedi. Deploy için ayrı kullanıcı CD kurulurken.
- [x] DNS: Cloudflare'de `yersen.aegis.net.tr` kaydı, proxy açık.
- [x] nginx: `yersen.aegis.net.tr` için `server` bloğu (statik dosyalar `/var/www/yersen`, `/api/` istekleri `127.0.0.1:3300`'e) ve certbot sertifikası. Değişiklikten önce `nginx -t` çalıştır. Diğer alt alan adları etkilenmemeli.
- [x] GitHub Actions: testler ve GHCR'ye imaj gönderme; sunucuda watchtower çeker (SSH anahtarı yok). `main` dalına push'tan sonra sunucuda yeni sürüm çalışıyor olmalı.
- [x] Tasarım yönü: `frontend-design` ve `impeccable` ile renk, yazı tipi ve bileşen dilini belirle. Kısa bir `DESIGN.md` yaz ve onaya sun. (Yön: "Yemek fişi". Bugün ekranı örnek veriyle kuruldu, gözden geçirmeden "ship" aldı. Bkz. `PRODUCT.md`, `web/DESIGN.md`, `web/.impeccable/surfaces/`.)

**Tamam sayılır:** Boş uygulama `yersen.aegis.net.tr` adresinde HTTPS ile açılıyor, `/health` 200 dönüyor, push'tan sonra deploy otomatik yapılıyor, tasarım yönü onaylandı.

## Faz 1: Yemekhane MVP

### Scraper
- [x] Gerçek sayfanın HTML'ini test verisi olarak kaydet. "BUGÜN" hücresi içeren bir örnek de olsun.
- [x] Ayrıştırıcı: HTML'den gün listesini çıkar (tarih, yemek satırları, kalori). Test, kaydedilmiş HTML'den beklenen JSON'u üretmeli.
- [x] "BUGÜN" hücresinin tarihini Europe/Istanbul saat dilimine göre çöz ve komşu hücrelerle tutarlılığını kontrol et. Testli olsun.
- [x] Eşleşme anahtarı fonksiyonu: boşluk temizliği, `(%NN)` silme, `tr-TR` küçük harf. Testlerde en az şu örnekler olsun: "İ"/"ı", "(%50)", çift boşluk, ayraçsız iki yemekli satır.
- [x] Yapı kontrolü: beklenen seçiciler bulunamazsa iş hata versin. "Menü henüz yayınlanmadı" durumu ayrı ele alınsın. İki durum da testli olsun.
- [x] Veritabanına yazma: menü, menü kalemleri ve yemekler. Aynı gün ikinci kez çalışınca kopya kayıt oluşmamalı.
- [ ] Sunucuda systemd timer kur (07:00 ve 10:00, Europe/Istanbul). Başarı ve hata durumları healthchecks.io'ya ping atsın. Hata durumunda mail gelmeli.

### Veritabanı ve yetki
- [x] Şema migration'ını yaz: `venue`, `menu`, `menu_item`, `dish`, `profile`, `invite_code`, `swipe`, `rating`.
- [ ] API yetki kuralları (servis katmanı hazır: setSwipe/rateDish banlıyı ve başkasının adına yazmayı reddeder; HTTP rotaları girişle gelecek): kullanıcı sadece kendi kaydırmasını ve puanını yazabilsin, menüyü giriş yapmış herkes okuyabilsin, banlı kullanıcı hiçbir şey yazamasın. Her kural için bir test olsun.
- [x] Puan kuralları: pencere (11:30'dan ertesi gün 11:30'a), "yemem" diyenin puanlayamaması, `user + dish + date` başına tek puan. API'de kontrol edilsin, veritabanında unique ve check kısıtlarıyla da güvenceye alınsın. Testli olsun.
- [x] Oran sınırı (saatte 300 kaydırma, 60 puan). Sınır aşılınca yazma reddedilmeli. Testli olsun.

### Giriş ve davet
- [ ] Better Auth ile Google girişini kur. Oturum çerezi `HttpOnly`, `Secure` ve `SameSite=Lax` olsun.
- [ ] İlk girişte davet kodu ekranı: geçerli kod kabul edilsin, kullanılmış ya da geçersiz kod reddedilsin. `invited_by` kaydedilsin.
- [ ] Takma ad seçimi: tekil olsun, uzunluk sınırı olsun.
- [ ] Kullanıcının kendi davet kodlarını görüp paylaşabildiği ekran (5 hak).
- [ ] Admin için kod üretme (başta SQL ya da basit bir admin sayfası yeterli).

### Arayüz
- [ ] PWA manifest'i, ikonlar ve service worker. Android'de ve iOS'ta ana ekrana eklenebilmeli.
- [ ] Kaydırma ekranı: gelecek günlerin henüz işaretlenmemiş yemekleri kart olarak gelsin. Sağa kaydırma "yerim", sola "yemem", yukarı "belki". Butonla da seçilebilsin.
- [ ] Kararlarım listesi: kullanıcı verdiği kararları görüp değiştirebilsin.
- [ ] Bugün ekranını (şu an `web/src/sample.ts` ile örnek veride) gerçek API'ye bağla; yükleniyor ve hata durumlarını ekle.
- [ ] Ana ekranda "Bugün yedin mi, puanla" kartı. Puanlama penceresi açıkken ve kullanıcının "yerim" ya da "belki" dediği bir yemek varsa en üstte görünsün.
- [ ] Puanlama ekranı: 1-10 seçimi. "Yemem" demiş ya da hiç kaydırmamış kullanıcı için "yedim" seçeneği.
- [ ] Gün kartı: tarih, yemekler, günlük kalori, her yemeğin ortalama puanı ve puan sayısı.
- [ ] Menü yok ekranları: hafta sonu/tatil ve "menü henüz yayınlanmadı" durumları.
- [ ] Yemek görselleri: Pexels'ten bir kez arayıp sakla, kaynak bilgisini göster. Bulunamazsa ikon göster. Admin görseli değiştirebilsin.
- [ ] Hakkında / Sözleşme / KVKK sayfası ve hesabı silme butonu.

### Operasyon
- [ ] Günlük `pg_dump` yedeği (sunucuda 14 gün tutulsun) ve haftalık R2 kopyası. Yedekten geri yükleme bir kez denenmiş olsun.
- [ ] Faz sonu güvenlik denetimi: `security-audit` skill'iyle tam denetim. Yüksek ve kritik bulgular kapatılmış olsun.
- [ ] Faz sonu tasarım denetimi: her ekran için `/impeccable audit`.

**Tamam sayılır:**
- Scraper bir hafta boyunca elle müdahale gerekmeden menüyü çekiyor.
- Bozuk HTML'le çalıştırıldığında hata maili geliyor.
- Davet koduyla giren bir kullanıcı telefonda uygulamayı ana ekrana ekleyip gelecek günleri kaydırabiliyor ve yemeğin günü puan verebiliyor.
- Kuralları çiğneyen yazmaları (pencere dışında puan, ikinci puan, "yemem" diyenin puanı, oran sınırı aşımı) veritabanı reddediyor.
- En az 5 gerçek kullanıcı bir hafta boyunca kullandı.

## Faz 2: Yorum ve moderasyon

- [ ] İsteğe bağlı okul maili doğrulaması (`@trakya.edu.tr`, mail ile gelen link). Doğrulanan hesaba yorum yetkisi açılır.
- [ ] Yorum yazma: puana bağlı ya da yemek sayfasında. Sadece doğrulanmış kullanıcılar yazabilsin. Uzunluk ve oran sınırı olsun.
- [ ] Hafif küfür filtresi: küfre izin verilir. Filtre sadece hedef alan kalıpları (isim ve hakaret birlikte, "aşçı/personel" ve hakaret birlikte) işaretleyip incelemeye düşürür. Testli olsun.
- [ ] "Bildir" butonu ve rapor kuyruğu.
- [ ] Moderatör/admin paneli: raporları görme, yorum silme, kullanıcı banlama, davet dalını topluca banlama, davet hakkını alma.
- [ ] Roller (`admin`, `moderator`, `user`) API yetki kontrollerine yansıtılsın ve testli olsun.

**Tamam sayılır:** Bildirilen bir yorum moderatör panelinden silinebiliyor, banlanan kullanıcı yeni yazma yapamıyor, davet dalı tek işlemle banlanabiliyor.

## Faz 3: Web Push

- [ ] Bildirim izni akışı. iOS'ta uygulama ana ekrana eklenmemişse ne yapacağını anlatan yönlendirme gösterilsin.
- [ ] Push aboneliklerini sakla.
- [ ] Gönderim işi: sadece o gün "yerim" diyenlere, yemekhane seanslarına göre. Tek hatırlatma mı, seans başına mı olacağını geliştiriciye sor.
- [ ] Bildirim tercihleri: kullanıcı kapatabilsin.

**Tamam sayılır:** Bir test kullanıcısının Android ve iOS (ana ekrana eklenmiş) cihazına doğru saatte tek bildirim geliyor, bildirimi kapatınca gelmiyor.

## Faz 4: Yurt menüleri

Sadece yemekhane tarafı oturduktan sonra başlanır. Başlamadan önce kapsamı geliştiriciyle yeniden konuş.

- [ ] Yurt listesi (seçmeli) ve profilde konaklama seçimi ("evde yaşıyorum" dahil). Puanlara `residence_tag` olarak yazılsın.
- [ ] Menü fotoğrafı yükleme ve onay kuyruğu (`status = pending`).
- [ ] OCR çıktı paketi: fotoğraf, ham OCR metni, gün gün taslak tablo, şüpheli yerler ve her yemek için güven alanlı (yüksek/orta/düşük) JSON. Yapay zeka doğrulaması için hazır bir prompt şablonu da olsun.
- [ ] Doğrulanmış JSON'u geri içe aktarma ve yayınlama.
- [ ] "Bizde menü farklı" butonu: kullanıcı yurdunu seçip fotoğraf ya da liste gönderebilsin, gönderim kuyruğa düşsün.
- [ ] Kahvaltı ve akşam öğünleri için puanlama pencereleri.

**Tamam sayılır:** Bir yurt menüsü fotoğraftan yayına kadar uçtan uca bir kez yayınlandı, yurt kullanıcısı kendi menüsünü görüp puanlayabiliyor.

## Faz 5: Yemek yeri ve ürün

- [ ] Mekan ve ürün ekleme (`venue.kind = place`, `dish.owner_venue_id`).
- [ ] Ürün eklerken o mekanın mevcut ürünlerini öneren otomatik tamamlama.
- [ ] Ürün puanlama kuralları (günlük menüye bağlı olmayan puanlama).

**Tamam sayılır:** Bir mekana iki ürün eklendi, üçüncü ürün eklenirken var olan iki ürün öneriliyor, ürünler puanlanabiliyor.
