---
version: 1
slug: "src-screens-today-tsx"
primary_target: "src/screens/Today.tsx"
related_targets: []
---

# Bugün ekranı (uygulama açılış ekranı)

Mode: operate. Hedef: telefon (390 px birincil), PWA. Masaüstünde dar bir sütun olarak ortalanır.

Kitle ve iş: Trakya öğrencisi, yemekhane sırasında ya da yemekten hemen sonra, tek elle. Bugün ne var, kaç puan almış, ben de puanlayayım. Ekran görüntüsüyle paylaşılır.

Durumlar: menü var ve puanlama açık; menü var, puanlama henüz açılmadı (11:30 öncesi); kullanıcı puanladı; hafta sonu/tatil; menü yayınlanmadı; yükleniyor; hata.

Kısıtlar: üniversite logosu yok, resmi görünüm yok; örnek veri "örnek veri" diye etiketli; altın asla açık zeminde metin rengi değil.

## Direction contract

THESIS: Her gün bir yemekhane fişi. Bugünün menüsü tek bir fiş, puan o fişe basılan mühür. Reddettiği kategori varsayılanı: görselli yemek kartları ızgarası ve yıldız puanları.

OWN-WORLD: Lacivert #112a79 üst bant ve alt çizgide altın #cb9832; zemin lacivertten soğutulmuş #f3f5fa; fiş beyaz, kesik çizgili koparma hattı; metin koyu lacivert #0d1a4a; iptal kırmızısı #c2382c yalnızca "yemem" damgasında. Titillium Web, sayılar tablo rakamı ve 900 ağırlık. Köşeler 6 px, gölge yok, tek kıl çizgi.

STORY: Öğrenci açar, bugünün fişini görür: yemekler ve sağda puanları, kaç kişinin puanladığı. Yediyse altın düğmeyle puanlar; fişe mührü basılır. Ekran görüntüsü alıp gruba atar.

FIRST VIEWPORT: Üstte lacivert bant: "yersen" kelime işareti solda, tarih sağda, altında 4 px altın çizgi. Ortada ekranı kaplayan bugünün fişi: başlık "Bugünün fişi", fiş numarası, yemek satırları (ad solda 19 px, puan sağda 30 px 900), oy sayısı altında, sağ üstte eğik altın ortalama mührü, koparma hattının altında günün kalorisi. Altta başparmak bölgesinde tam genişlik altın "Yedim, puanla" düğmesi, en altta üç sekmeli gezinme: Bugün, Kaydır, Ben.

FORM: Yemek fişi ve turnike ritüeli; kendi listemin 7. adayı (zar). seed:fb1305089a7c8109. İmza hareketi: puan verilince fişe altın mührün basılması (tek, ölçülü bir damga animasyonu; hareket azaltmada anında görünür). Raise satırları: durumlar damga olur hiçbir şey kaybolmaz (bilet cüzdanı); az oyun puanı küçük ve soluk (yıldız atlası); boşluk şişirmeyen yoğunluk (Japon yoğun web); kaydırmada tek karar (terminal yönlendirme); sabit hücreli rakamlar (kalkış tabelası).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
