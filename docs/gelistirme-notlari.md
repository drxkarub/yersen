# Geliştirme notları

Kodda ya da git geçmişinde kendiliğinden görünmeyen, çalışırken öğrenilmiş şeyler. Sunucuya özel bilgi burada değil, `docs/sunucu.local.md`'de (repoya girmez).

## Tester geri bildirimleri (Kasım 2026)

| Geri bildirim | Ne yapıldı |
|---|---|
| Puanlama yeri bulunamadı, yemek adına dokunuldu | Satırın tamamı dokunulabilir; puanlanmamış satırda altın kesik çerçeveli "Puanla" ipucu |
| Deste yalnızca bugün/yarın olsun, ana yemek + tatlı | Bugün + 3 menülü gün, `inDeck` (ana yemek ve tatlı); "Sonraki günlere devam et" |
| Kaydırma özelliği geç keşfediliyor | Reels tarzı el animasyonu; ilk gerçek kaydırmada kalıcı olarak kapanır (`yersen.kaydirmaOgrenildi`) |
| Hepsi kaydırılınca bir daha kaydırılamıyor | "Baştan kaydır" (ayın kalanını kapsar) |
| Diğer günlerin menüsü görülemiyor | Bugün ekranında gün gezgini (takvim değil, ileri/geri) |
| Yoğurt/ayran gelecek günde puanlı görünüyor | Puanlar güne ait; önceki çıkışlar ayrı alan (bkz. CLAUDE.md) |
| "Yemedim" deyip puanlı kalınabiliyor | "Yemem" ile puan bir arada durmaz; 0007 göçü eski kayıtları temizledi |

Bekleyen fikir: herkesin yemekhanede asla çıkmayacağını bildiği "hayal" yemekleri desteye karıştırmak (Faz 2 sonrası, "Hayal menüsü").

## Yerelde çalışma

- Google'sız deneme: `DEV_FAKE_USER=dev1 npm run dev -w api` + `npm run dev -w web`. `dev1` = "denemeci" (rolü `user`; denemede admin yapıp sonra geri al).
- Profilsiz biri olarak hoş geldin ekranını görmek için `DEV_FAKE_USER=yeni_bir_id`.
- Giriş yapmamış ekran (tanıtım sayfası) için API'yi `DEV_FAKE_USER` olmadan aç.
- Admin rotalarına elle istek: `Origin` başlığı `.env`'deki `BETTER_AUTH_URL` (yerelde `http://localhost:5173`) olmalı, yoksa 403.
- Test için menü eklerken `source: "scraper"` (enum).
- Süreçleri durdururken desende köşeli parantez kullan, ayrı komutta: `pkill -f "[t]sx watch --env-file"`, `pkill -f "node_modules/.bin/[v]ite"`. Düz desen komutu çalıştıran kabuğu da öldürür (çıkış 144).
- Görsel kontrol: headless Chrome (`--remote-debugging-port`) + CDP üzerinden küçük bir node betiği (Page.navigate, Runtime.evaluate ile tıklama, Page.captureScreenshot), 390 ve 320 px genişlikte.

## Bilinen davranışlar

- **PWA güncellemesi:** `registerSW` main.tsx'te; yeni sürüm gelince sayfa bir kez kendini yeniler, uygulama öne gelince ve saatte bir güncelleme sorulur. 2026-11-20 öncesi sürümdeki kullanıcılar bir kez elle yenilemeli (Ctrl+Shift+R / uygulamayı kapatıp aç).
- **Cloudflare enjeksiyonu:** HTML `Cache-Control: no-cache, no-transform` ile gider; yoksa Cloudflare satır içi bot/analitik betiği ekler ve CSP (`script-src 'self'`) engeller, konsol hata verir.
- **CI takılması:** Testler bir kez 15 dk takılıp iptal oldu, yerelde tekrarlanmadı. Test adımı 5 dk zaman aşımı + bir yeniden deneme + `hanging-process` raporlayıcısıyla çalışır; tekrar olursa çıktısında takılan süreç görünür.
- **Ardışık push:** Yeni push önceki CI çalışmasını iptal eder ("cancelled"); son çalışma her şeyi içerir, sorun değil.
