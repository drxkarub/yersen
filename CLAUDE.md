# yersen

> "Yersen gel puanla, yemezsen keyfin bilir."

Trakya Üniversitesi öğrencileri için yemekhane menüsü PWA'sı. Kullanıcı önümüzdeki günlerin yemeklerini kaydırarak işaretler (yerim / yemem / belki), yemeğin günü gelince 10 üzerinden puanlar. Hedef kitle: geliştiricinin çevresi ve çevresinin çevresi. Global değil.

Adres: `yersen.aegis.net.tr`. Arayüz dili sadece Türkçe.

## Çalışma kuralları

- Kod yazmadan önce `TODO.md`'yi oku. Sadece sıradaki fazın maddeleri üzerinde çalış.
- Bir maddeyi bitirince `TODO.md`'de işaretle. Madde "test edilebilir" tanımına uymuyorsa önce maddeyi böl.
- Bir faz, o fazın "Tamam sayılır" koşulları sağlanmadan kapanmaz. Sonraki faza geçmeden önce onay iste.
- Buradaki kararlardan birini değiştirmen gerekirse önce sor. Onaylanınca bu dosyayı güncelle.
- Tüm dosyalar bu klasörün içinde kalır. Klasör dışına dosya yazma.
- Gizli anahtarlar (Google OAuth secret, Pexels key, veritabanı şifresi vb.) asla repoya girmez. `.env` dosyası ve GitHub Secrets kullanılır.
- "İleride" listesindekileri şimdi yapma, ama veri modelinde bunların önünü kesme.
- **Tasarım:** Arayüz işine başlamadan önce `frontend-design` ve `impeccable` skill'lerini yükle. Şablon görünümlü "AI slop" tasarımdan kaçın: varsayılan mor gradyanlar, her yerde yuvarlak kartlar, rastgele emoji ve jenerik Inter + gölge kombinasyonu kullanma. Bir ekran bitince `/impeccable audit` ve `/impeccable critique` ile kontrol et.
- **Güvenlik:** Her fazın sonunda `security-audit` skill'iyle o fazın kodunu denetle. Bulunan yüksek ve kritik önemdeki açıklar kapanmadan faz kapanmaz.
- **Kod haritası:** Kod tabanı büyüdükçe mimari sorularda `/graphify` ile güncel grafiği kullan.

## Teknoloji ve barındırma

Hepsi mevcut VPS'te çalışır: Debian 12, 2 çekirdek, 2 GB RAM, 40 GB disk, 2 GB swap. Sunucu başka servislerle paylaşılıyor. Yersen servisleri Docker Compose ile ayağa kalkar.

**Sunucuya özel kısıtlar:** Portlar, güvenlik duvarı ve sunucudaki diğer servisler `docs/sunucu.local.md` dosyasında. Bu dosya güvenlik nedeniyle repoya girmez; sunucu işine başlamadan önce oku. Genel kurallar:
- Sunucuda zaten nginx ve certbot var. Yersen ayrı reverse proxy kurmaz, kendi `server` bloğunu ekler.
- `yersen.aegis.net.tr` Cloudflare proxy'si arkasında. İstemcinin gerçek IP'si `CF-Connecting-IP` başlığından alınır, oran sınırı bu IP'yi kullanır.
- Docker'ın yayınladığı portlar güvenlik duvarını atlatır. Her port `127.0.0.1:` önekiyle yayınlanır (API: `127.0.0.1:3300`). Postgres hiç port yayınlamaz.
- Bellek sınırları sabit: Postgres 256 MB, API 192 MB, scraper 128 MB.
- Deploy sadece CI'dan yapılır; sunucudaki otomatik imaj güncelleyiciler yersen'e dokunmaz.

| Katman | Seçim | Neden |
|---|---|---|
| Reverse proxy | Sunucudaki nginx ve certbot | Zaten 80/443'te çalışıyor, ikinci bir proxy RAM ve port çakışması demek. |
| Ön yüz | Vite + React + TypeScript, `vite-plugin-pwa` | Statik olarak derlenir, `/var/www/yersen` altından nginx servis eder. Çalışma sırasında RAM harcamaz. |
| API | Node 24 LTS + Hono + TypeScript | Hafif ve hızlı. Ön yüzle aynı dil ve tipler kullanılır. Yaklaşık 100-150 MB RAM. |
| Giriş | Better Auth (Google OAuth) | Kendi sunucunda çalışır, oturumları Postgres'te tutar. Dış servis bağımlılığı yok. |
| Veritabanı | PostgreSQL 17 | Az kaynak için ayarlanır (`shared_buffers=256MB`, `max_connections=30`). Yaklaşık 200-300 MB RAM. |
| ORM ve migration | Drizzle + drizzle-kit | Tip güvenli, ince bir katman. Migration'lar SQL dosyası olarak repoda durur. |
| Doğrulama | zod | API girdileri için. Şemalar ön yüzle paylaşılır. |
| Zamanlanmış işler | Sunucuda systemd timer + `docker compose run --rm scraper` | API çökse bile scraper çalışır. |
| İzleme | healthchecks.io (ücretsiz katman) | Scraper ve yedekleme her çalışmada ping atar. Hata ya da hiç ping gelmemesi durumunda mail gönderir. |
| Yedekleme | Günlük `pg_dump` | Sunucuda 14 günlük yedek tutulur. Haftalık bir kopya `rclone` ile Cloudflare R2'ye (10 GB'a kadar ücretsiz) gönderilir. |
| CI/CD | GitHub Actions | Testler çalışır, Docker imajı derlenip GHCR'ye gönderilir, sunucu SSH ile yeni imajı çekip yeniden başlatır. İmaj VPS'te derlenmediği için RAM sorunu olmaz. |
| Yemek görselleri | Pexels API | Ücretsiz ve serbest lisanslı. Görseller indirilip WebP'ye küçültülür ve diskte tutulur. Kaynak gösterilir. |

**Yetki kuralları:** Puanlama penceresi, tek puan ve "yemem" diyenin puanlayamaması API katmanında kontrol edilir. Bunun yanında veritabanı kısıtlarıyla (unique, check, trigger) ikinci kez güvenceye alınır. Testler gerçek bir Postgres'e karşı çalışır: yerelde ve testlerde PGlite (WASM Postgres), üretimde PostgreSQL 17. Aynı Drizzle migration'ları ikisinde de uygulanır.

## Geliştirme komutları

- `npm run dev`: API (`127.0.0.1:3300`) ve ön yüz (`localhost:5173`, `/api` proxy'li) birlikte açılır.
- `npm test`: bütün paketlerin testleri.
- `npm run typecheck`: bütün paketlerin tip kontrolü.
- `npm run db:generate -w api`: şemadan yeni migration üretir.
- Yerel veritabanı `api/.pglite/` klasöründedir. Silmek veritabanını sıfırlar.

**Tahmini RAM kullanımı:** Yersen servisleri toplam 400-450 MB. Diğer servislerle birlikte sunucu yaklaşık 1.5 GB'a çıkar. Sığar, ama pay az. Bellek sınırları bu yüzden zorunlu.

## Veri kaynağı: okul yemekhanesi

- Adres: https://www.trakya.edu.tr/yemeklistesi (birim: Merkez Kampüsler, `data-birim="48357578"`).
- Sayfa sunucuda üretilen düz HTML, menü içeriği JS ile yüklenmiyor. Her gün `#ylistTable .mitem` içinde bir hücre: `h4` başlıkta tarih (`dd.MM.yyyy`), ardından `<br>` ile ayrılmış yemek satırları, en sonda `<small>` içinde **günlük toplam** kalori ("872 Kal").
- **Dikkat 1:** Bugünün hücresinde tarih yerine "BUGÜN" yazıyor. Bu hücrenin tarihi, scraper'ın çalıştığı günün Europe/Istanbul saat dilimindeki tarihinden alınır. Sonra komşu hücrelerin tarihleriyle tutarlı olup olmadığı kontrol edilir.
- **Dikkat 2:** Kalori yemek başına değil gün başına. Gün kartında gösterilir.
- **Dikkat 3:** Bazı satırlarda iki yemek ayraçsız yazılmış ("TAVUK DÖNER PATATES KIZARTMASI"). Normalizasyon kuralı gereği bu tek yemek sayılır, bölünmez.
- Sadece hafta içi günler var. Arşiv için ay seçici var (`yemekTarih`, değer biçimi `11-2026`).
- Diğer birimler (Hastane, ilçeler) de sayfada var. İleride eklenebilir.
- Scraper her gün çalışır, ay başında menü henüz yüklenmemişse ertesi gün yeniden dener.
- **Bozulma kontrolü:** Sayfada beklenen yapı (`#ylistTable`, `.mitem`, tarih biçimi) yoksa ya da ayın menüsü hâlâ yayınlanmamışken bulunan gün sayısı sıfırsa iş başarısız olur ve healthchecks.io'ya hata bildirir, oradan mail gelir. Menünün yayınlanmamış olması ile sayfa yapısının bozulması ayrı durumlar olarak ayırt edilir.

## Kararlar

### Giriş ve hesap
- Google ile giriş. İlk girişte **tek kullanımlık davet kodu** zorunlu.
- Her kullanıcının 5 davet kodu hakkı var. Admin bu sayıyı değiştirebilir ve sınırsız kod üretebilir.
- Kimin kimi davet ettiği kaydedilir (davet ağacı). Sahte hesap dalları topluca banlanabilir, davet edenin kod hakkı alınabilir.
- Kullanıcı takma adla görünür. Gerçek isim ve e-posta hiçbir yerde gösterilmez.
- Okul maili (`@trakya.edu.tr`) doğrulaması isteğe bağlı ve süresiz. Doğrulayan kullanıcı yorum yazabilir (Faz 2).
- Puanlar baştan ortalamaya katılır. Öncelik uygulamanın yayılması.
- KVKK: kısa bir aydınlatma metni ve hesap/veri silme imkanı.

### Kaydırma ve puanlama
- Kaydırma ileriye dönük bir beklenti sinyali: kullanıcı yayınlanmış menüdeki gelecek günlerin yemeklerini işaretler (yerim / yemem / belki). Kaydırma puan değildir.
- O gün sadece "yerim" ya da "belki" diyenler puanlayabilir. "Yemem" diyen kararını istediği zaman, yemeğin günü dahil, değiştirebilir. Kaydırmamış kullanıcı puanlama ekranında "yedim" diyerek puanlayabilir.
- Kullanıcı başına, yemek başına, gün başına bir puan (1-10). Puan pencere açıkken değiştirilebilir.
- Yemekhane seansları: sabah 11:30-13:30, akşam 16:30-19:30. İki seansın menüsü aynı, yani günde tek menü ve tek puan var.
- Puanlama penceresi: o gün 11:30'dan ertesi gün 11:30'a kadar.
- Puanlamanın ana yolu, uygulama açılınca ilk ekranda duran "Bugün yedin mi, puanla" kartı. Web Push Faz 3'te gelecek ve hiçbir zaman tek yol olmayacak.
- Puanlar yemek bazlı ve tek havuzda.
- **Eşleşme anahtarı:** Menüde yazan ad gösterilir. Eşleştirme için şu kurallar uygulanır, başka normalizasyon yapılmaz:
  1. Baştaki ve sondaki boşluklar silinir, çoklu boşluk teke indirilir.
  2. Parantez içindeki yüzde ekleri (`(%50)` gibi) silinir.
  3. `toLocaleLowerCase('tr-TR')` uygulanır (İ→i, I→ı).
- **Oran sınırı:** Kullanıcı başına saatte en fazla 300 kaydırma ve 60 puan yazımı. Sınırlar veritabanında kontrol edilir.

### Görseller
- Her yemeğe bir temsili görsel eklenir ve "temsili görsel" etiketiyle gösterilir.
- Görsel, eşleşme anahtarına göre bir kez Pexels'ten aranır ve saklanır. Yanlış çıkan görseli admin değiştirebilir.
- Görsel bulunamazsa yemek adındaki anahtar kelimeye göre bir ikon gösterilir ("ÇORBA" geçiyorsa çorba ikonu gibi).

### Menü yok ekranı
- **Hafta sonu ve tatil:** "Bugün yemekhane kapalı" mesajı ve bir sonraki menülü günün yemekleri.
- **Ay başında menü yayınlanmadıysa:** "Menü henüz yayınlanmadı, son kontrol: <saat>" mesajı ve geçen ayın en yüksek puanlı yemekleri.

### Yorum ve moderasyon (Faz 2)
- Küfür serbest. Hedef alan, taciz eden, tartışma çıkaran ya da kişileri (personel, aşçı) hedef alan yorum silinir, kullanıcı banlanır.
- Hafif küfür filtresi, "bildir" butonu, roller: `admin`, `moderator`, `user`. Başta tek admin geliştirici.
- Kurallar "Hakkında / Sözleşme" sayfasında yazar, kayıtta ayrıca gösterilmez.

## Veri modeli taslağı (geleceğe açık)

- `venue`: yemek yeri. Yemekhane, ileride yurt ve mekanlar. `kind` (cafeteria / dorm / place), `city`, `university`.
- `menu`: bir venue'nün bir gündeki menüsü. Alanlar: `venue_id`, `date`, `meal_slot` (`daily` / `breakfast` / `dinner`), `kcal`, `status` (`published` / `pending`), `source` (`scraper` / `user_upload` / `admin`).
- `menu_item`: `menu_id`, `dish_id`, `position`, `raw_name` (menüdeki ham ad).
- `dish`: `key` (eşleşme anahtarı, tekil), `display_name`, `image_url`, `image_credit`, `owner_venue_id` (yemekhane yemekleri için boş, ileride bir mekanın ürünü için dolu).
- `profile`: `nickname`, `role`, `invited_by`, `invite_quota`, `residence_venue_id` (ileride yurt için, şimdi boş), `school_email_verified_at`, `banned_at`.
- `invite_code`: `code`, `created_by`, `used_by`, `used_at`.
- `swipe`: `user_id`, `menu_item_id`, `choice` (`yes` / `no` / `maybe`). Tekil anahtar `user_id + menu_item_id`.
- `rating`: `user_id`, `dish_id`, `date`, `score` (1-10), `residence_tag` (puan verildiği andaki konaklama bilgisi, şimdi boş). Tekil anahtar `user_id + dish_id + date`.
- Faz 2: `comment`, `report`, `moderation_action`.

## İleride (şimdi yapma)

- **Yurt menüleri:** KYK yurtlarında kahvaltı ve akşam menüsü var. Fotoğraf yüklenecek, OCR yapılıp yapay zekaya manuel doğrulatılacak, menü onay kuyruğuna girecek. "Bizde menü farklı" butonu, yurt seçimi ve "evde yaşıyorum" seçeneği eklenecek.
- **Yemek yeri ve ürün:** Mekan değil ürün puanlanır. Ürün eklerken o mekanın mevcut ürünleri otomatik tamamlamayla önerilir.
- Başka şehir ya da üniversite, yemekhanenin diğer birimleri.
