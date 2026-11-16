# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Trakya Üniversitesi öğrencileri (Edirne, Merkez Kampüsler yemekhanesi). Başlangıçta geliştiricinin çevresi ve onların çevresi. Davet koduyla katılıyorlar, global bir kitle değil.

Kullanım anları (geliştirici tarafından onaylandı):
- **Yemekhane sırasında:** Telefonda, tek elle, ayakta. "Bugün ne var, kaç puan almış?"
- **Yemekten hemen sonra:** Masada ya da çıkışta, birkaç saniyede puan verme.
- **Arkadaş grubunda paylaşırken:** "Bugün kuru fasulye 3.2 almış" diye ekran görüntüsü ya da link atma.

Akşam rahatça kaydırma da var, ama birincil an değil.

## Product Purpose

Kullanıcı yemekhanenin önümüzdeki günlerdeki yemeklerini kaydırarak işaretler (yerim / yemem / belki). Yemeğin günü gelince 10 üzerinden puanlar. Başarı ölçütleri:
- Öğrenciler sıraya girmeden önce bugünün menüsünü ve puanlarını yersen'den kontrol ediyor.
- Yemekten sonra puan vermek alışkanlık haline geliyor.
- Puanlar arkadaş gruplarında paylaşılıyor.

## Positioning

Okulun sitesi menüyü sadece listeliyor. yersen ise menüyü öğrencilerin kendi puanlarıyla gösteriyor ve yemekten önce bir beklenti (kaydırma), yemekten sonra bir hüküm (puan) topluyor. Puanlar sadece o yemeği yiyen ya da yiyebilecek öğrencilerden geliyor.

## Operating Context

- **Yemekhane:** Hafta içi açık, iki seans var: 11:30-13:30 ve 16:30-19:30. İki seansın menüsü aynı.
- **Menü kaynağı:** Okulun sitesi (trakya.edu.tr/yemeklistesi). Her gün bir çorba, bir ana yemek, bir ya da iki yan yemek ve bir tatlı/meyve/içecek var. Kalori günün toplamı olarak veriliyor. Yemek adları büyük harfle yazılmış ("ETLİ NOHUT", "DÜĞÜN ÇORBA").
- **Menü yayını:** Aylık. Ay başında gecikebiliyor.
- **Ekran:** PWA olarak ana ekrana eklenerek kullanılıyor, çoğunlukla telefonda. Web Push bildirimleri ileride gelecek.

## Capabilities and Constraints

- **Giriş:** Google hesabı ve tek kullanımlık davet kodu. Kullanıcılar takma adla görünür. Okul maili doğrulaması isteğe bağlı ve yorum yazma yetkisi açıyor.
- **Puanlama:** 1-10. Kullanıcı başına, yemek başına, gün başına bir puan. "Yemem" diyen puan veremez ama kararını değiştirebilir. Puanlama penceresi: o gün 11:30'dan ertesi gün 11:30'a kadar.
- **Görseller:** Yemek görselleri temsilidir (Pexels), "temsili görsel" olarak etiketlenir. Görsel yoksa ikon gösterilir.
- **Gelecek:** Yurt menüleri (kahvaltı/akşam), başka üniversiteler, mekan ürünleri.
- **Tema:** Her üniversitenin kendi temasını taşıyabilmesi gerekiyor (bkz. Brand Commitments).
- **Arayüz dili:** Sadece Türkçe.

## Brand Commitments

- **İsim:** yersen (küçük harf). **Slogan:** "Yersen gel puanla, yemezsen keyfin bilir."
- **Ses tonu:** Esprili, hafif laf sokan bir öğrenci dili. Kısa ve takılan, ama kaba ya da kırıcı değil. Hata ve boş ekranlar da bu sesle konuşur, ama ne olduğunu ve ne yapılacağını her zaman açıkça söyler.
- **Logo:** Yok, sıfırdan tasarlanacak.
- **Üniversite akrabalığı:** Arayüz, kullanıcının üniversitesinin kendi sitesine benzemeli. Trakya için kaynak: trakya.edu.tr'deki lacivert `#112a79` ve altın `#cb9832`. İleride her üniversite kendi renk ailesini taşıyacak, tema sistemi buna göre kurulmalı.
- **Bağımsızlık (zorunlu):** yersen resmi bir üniversite uygulaması değildir ve öyle görünmemelidir. Üniversite logosu, amblemi, mührü ya da resmi yazı biçimi kullanılmaz. "Hakkında" sayfasında ve giriş ekranında "Trakya Üniversitesi ile resmi bir bağı yoktur" ifadesi bulunur.

## Evidence on Hand

- Gerçek menü verisi trakya.edu.tr'den çekiliyor. Kasım 2026 örnekleri: "DÜĞÜN ÇORBA / ETLİ NOHUT / BULGUR PİLAVI / MEVSİM SALATA, 872 Kal".
- Henüz kullanıcı, puan, yorum ya da kullanıcı yorumu yok. Tasarımlarda ve örnek içerikte uydurma puan ortalaması "gerçek veri" gibi sunulmaz. Örnek veri açıkça örnektir.

## Product Principles

1. **Bugün önce gelir.** En sık soru "bugün ne var ve nasıl?". Bu cevap uygulamayı açar açmaz, tek bakışta görünür.
2. **Puanlamak üç saniyeden kısa sürer.** Tek elle, tek dokunuşla puan verilir. Gerisi isteğe bağlıdır.
3. **Paylaşılabilir hüküm.** Bir yemeğin puanı ekran görüntüsünde de anlaşılır olmalı: yemek adı, tarih ve puan bir arada.
4. **Öğrencinin sesi, okulun rengi.** Renkler üniversitenin ailesinden, ses ise öğrencilerden gelir. Hiçbir zaman okulun resmi sesiyle konuşmaz.
5. **Dürüst veri.** Az oy varsa bunu gösterir (ör. "3 kişi puanladı"). Görselin temsili olduğunu saklamaz.

## Accessibility & Inclusion

- Tek elle kullanım: Birincil eylemler başparmağın erişebileceği alt bölgede durur.
- Dışarıda ve parlak ışıkta okunabilirlik: Puanlar ve yemek adları yüksek kontrastlı olur (WCAG AA).
- Kaydırma hareketinin her zaman bir buton alternatifi olur. Hareket azaltma tercihine (`prefers-reduced-motion`) uyulur.
