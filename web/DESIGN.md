---
name: yersen
description: Yemekhane fişi gibi basılan günlük menü ve öğrenci puanları; renkleri üniversitenin, sesi öğrencinin.
colors:
  marka: "#112a79"
  marka-koyu: "#0d1a4a"
  vurgu: "#cb9832"
  vurgu-basili: "#b5852a"
  iptal: "#c2382c"
  zemin: "#f3f5fa"
  fis: "#ffffff"
  cizgi: "#e3e7f1"
  koparma: "#c9d0e3"
  ikincil: "#5d6688"
  soluk: "#7f88a8"
  bant-ikincil: "#c9d3f0"
  masaustu-zemin: "#dfe4f1"
typography:
  display:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  score:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  wordmark:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Titillium Web, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  damga: "4px"
  kose: "6px"
  hap: "999px"
  muhur: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
components:
  button-primary:
    backgroundColor: "{colors.vurgu}"
    textColor: "{colors.marka-koyu}"
    rounded: "{rounded.kose}"
    height: "58px"
    width: "100%"
  button-primary-active:
    backgroundColor: "{colors.vurgu-basili}"
    textColor: "{colors.marka-koyu}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.marka}"
    rounded: "{rounded.kose}"
    height: "52px"
    width: "100%"
  button-secondary-active:
    backgroundColor: "{colors.marka}"
    textColor: "{colors.fis}"
  olcek-tus:
    backgroundColor: "{colors.fis}"
    textColor: "{colors.marka}"
    rounded: "{rounded.kose}"
    height: "50px"
  olcek-tus-active:
    backgroundColor: "{colors.marka}"
    textColor: "{colors.fis}"
  bant:
    backgroundColor: "{colors.marka}"
    textColor: "{colors.fis}"
    padding: "14px 18px 12px"
  fis:
    backgroundColor: "{colors.fis}"
    textColor: "{colors.marka-koyu}"
    rounded: "{rounded.kose}"
    padding: "16px 18px 14px"
  sekme:
    backgroundColor: "{colors.fis}"
    textColor: "{colors.ikincil}"
    typography: "{typography.label}"
    height: "64px"
  sekme-active:
    textColor: "{colors.marka}"
---

# Design System: yersen

## Overview

**Creative North Star: "Yemekhane Fişi"**

Her gün tek bir fiş basılır. Bugünün menüsü beyaz bir fişin satırlarıdır, puan o fişe basılan altın bir mühürdür. Sistem bir yemekhane turnikesinin, bir tabldot fişinin, bir kalkış tabelasının dilinden konuşur: sabit hücreli rakamlar, kıl gibi ince çizgiler, kesik koparma hattı, eğik basılmış damgalar. Görselli yemek kartı ızgarası ve yıldız puanı bu dünyanın reddettiği varsayılanlardır.

Yoğunluk telefona göre ayarlıdır: boşluk şişirilmez, bir yemek satırı ad, oy sayısı ve puanı tek bakışta verir; birincil eylem başparmak bölgesinde tam genişlikte durur. Renk üniversiteden, ses öğrenciden gelir. Arayüz kullanıcının üniversitesinin sitesine akraba görünür ama asla resmi görünmez: üniversite logosu, amblemi, resmi mührü ya da resmi yazı biçimi hiçbir ekranda kullanılmaz. Uygulamadaki "mühür" yersen'in kendi puan damgasıdır, kurumun mührü değildir.

Durumlar kaybolmaz, damgalanır: kapalı gün ya da yayınlanmamış menü boş ekran değil, üstüne "Kapalı" ya da "Bekleniyor" damgası basılmış bir durum fişidir.

**Key Characteristics:**
- Tek beyaz fiş, lacivert bant ve altın alt çizgi; tek kolon, en fazla 480px.
- Puanlar 900 ağırlıkta, tablo rakamlı, sağa hizalı; az oylu puan küçük ve soluk.
- Tek imza hareketi: puan verilince fişe mühür basılması.
- Bulanık gölge yok; derinlik kıl çizgi ve ton farkıyla.
- Her üniversite aynı token adlarının kendi `[data-uni]` bloğudur.

## Colors

Lacivert ve altından oluşan, zemini lacivertten soğutulmuş iki renkli bir aile; kırmızı yalnızca tek bir damgaya ayrılmıştır.

### Primary
- **Trakya Laciverti** (`--marka`): Üst bant zemini, puan rakamları, ölçek tuşlarının rakamı, seçili sekme, ikincil düğmenin çerçevesi ve durum damgası. Ekranda "hüküm" bu renkle yazılır. `index.html` içindeki `theme-color` da bu değerdir.

### Secondary
- **Tabldot Altını** (`--vurgu`): Bant altındaki 4px çizgi, gün mührünün ve kişisel mührün çerçevesi, ana düğmenin zemini, seçili sekmenin üst çizgisi, lacivert bant üstündeki odak halkası, metin seçimi. Altın her zaman bir yüzey, çizgi ya da çerçevedir; üstündeki metin koyu laciverttir.
- **Basılı Altın** (`--vurgu-basili`): Ana düğmenin `:active` hali; yalnızca basılı durum için.

### Tertiary
- **İptal Kırmızısı** (`--iptal`): Yalnızca kişisel "yemedim" damgasının çerçevesi ve metni. Başka hiçbir uyarı, hata ya da vurgu için kullanılmaz.

### Neutral
- **Koyu Lacivert Mürekkep** (`--marka-koyu`): Gövde metni, başlıklar, yemek adları, mühürlerin içindeki rakamlar, altın düğme üstündeki metin.
- **Soğuk Zemin** (`--zemin`): Sayfa zemini ve fiş içinde etkin (puanlanan) satırın zemini.
- **Fiş Beyazı** (`--fis`): Fiş, ek listeler, alt gezinme, ölçek tuşları.
- **Kıl Çizgi** (`--cizgi`): Yemek satırları arası 1px ayraç, alt gezinmenin üst kenarı, masaüstünde sütun kenarı.
- **Koparma Grisi** (`--koparma`): Fişin 2px kesik koparma hattı, fişin altındaki 1px taban çizgisi, ölçek tuşlarının çerçevesi, kaydırma çubuğu.
- **İkincil Mürekkep** (`--ikincil`): Oy sayısı, fiş numarası, ölçek sorusu, kalori satırı, pasif sekmeler, bilgi metni. Hem zeminde hem fişte AA geçer.
- **Soluk Mürekkep** (`--soluk`): Yalnızca az oylu puan rakamı (22px, 900). Büyük yazı eşiğini geçer: fişte 3.5:1, zeminde 3.2:1.
- **Bant Mürekkebi** (`--bant-ikincil`): Lacivert bant üstündeki tarih gibi ikincil metin.
- **Masaüstü Kenar Zemini** (`masaustu-zemin`): 600px üstünde dar sütunun iki yanındaki derin zemin. Tema token'ı: `--masaustu-zemin`.

### Named Rules
**The Üniversite Bloğu Rule.** Her üniversite, `styles.css` içinde aynı token adlarını (`--marka`, `--marka-koyu`, `--vurgu`, `--vurgu-basili`, `--zemin`, `--fis`, `--cizgi`, `--koparma`, `--ikincil`, `--soluk`, `--iptal`, `--bant-ikincil`) taşıyan tek bir `[data-uni="<kod>"]` bloğudur; tema `<html data-uni="...">` ile seçilir. Bileşen CSS'i hiçbir zaman ham renk yazmaz, yalnızca bu token'ları okur. Trakya (`[data-uni="trakya"]`, aynı zamanda `:root` varsayılanı) değerleri trakya.edu.tr'nin lacivert ve altınından türetilmiştir; yeni bir üniversitenin değerleri de kendi sitesinin renk ailesinden türetilir.

**The Logosuz Akrabalık Rule.** Üniversiteye renkle benzenir, işaretle asla. Hiçbir temada üniversite logosu, amblemi, resmi mührü ya da kurumsal yazı biçimi yer almaz.

**The Altın Metin Değildir Rule.** Altın açık zeminde (`--zemin`, `--fis`) asla metin rengi olmaz; orada kontrastı 2,6:1'in altındadır. Altın yalnızca çizgi, çerçeve ve dolgu olur, üstüne koyu lacivert yazılır (6,4:1).

**The Tek Kırmızı Rule.** `--iptal` yalnızca "yemedim" damgasına aittir.

## Typography

**Display Font:** Titillium Web (with system-ui, sans-serif)
**Body Font:** Titillium Web (with system-ui, sans-serif)

**Character:** Tek aile, dört ağırlık (400, 600, 700, 900). Titillium'un dar, mühendislik tabelası karakteri hem fiş başlığına hem kalkış tabelası gibi rakamlara yeter; 900 ağırlık puanları ve kelime işaretini damga gibi basar. Font `@fontsource/titillium-web` ile kendi sunucumuzdan yüklenir; Google Fonts ya da başka CDN'e istek gitmez.

### Hierarchy
- **Wordmark** (900, 26px, 1, -0.02em): Bantta küçük harfli "yersen" kelime işareti. Logo yerine geçen tek yazı.
- **Display** (700, 30px, 1.05, -0.01em): Fiş başlığı ("Bugünün fişi"); durum fişinde 28px, `text-wrap: balance`.
- **Score** (900, 30px, 1, tablo rakamı): Yemek puanı, sağa hizalı, en az 2.6ch genişlik. Gün mührü içinde 32px; ek listede 24px; az oyda 22px. Ondalık ayraç Türkçe virgüldür ("7,5").
- **Title** (600, 19px, 1.2): Yemek adı, ek liste başlığı (700). Ek listedeki satırlar 17px/600.
- **Body** (400, 16px, 1.4): Gövde; durum fişi açıklaması 17px, en fazla 34ch.
- **Label** (600, 14–15px): Fiş numarası, sekme etiketleri, ölçek sorusu, bant tarihi.
- **Caption** (400, 13px): Oy sayısı ("42 kişi puanladı").
- **Button** (700, 21px ana; 18px ikincil): Başparmak bölgesindeki düğmeler.

### Named Rules
**The Kalkış Tabelası Rule.** Puan, oy, fiş numarası ve ölçek tuşları gibi her sayı `font-variant-numeric: tabular-nums` ile basılır; rakamlar sabit hücrede durur, puan değişince satır titremez.

**The Az Oy Rule.** Oy sayısı eşik değerin (`LOW_VOTES = 5`) altındaysa puan rakamı 22px ve `--soluk` renkte basılır. Hiyerarşiyi oy sayısı taşır; az oylu puan, çok oylu puan kadar bağırmaz. Oy sayısı da her zaman satırda yazılı durur.

## Layout

Tek kolon, mobil öncelikli (390px birincil, 320px'e kadar çalışır). Kabuk en fazla 480px genişlikte ortalanır; 600px üstünde iki yan `masaustu-zemin` ile doldurulur ve sütun 1px kıl çizgiyle çevrilir. Dikey düzen üç parça: üstte yapışkan bant (güvenli alan payıyla), ortada esneyen içerik, altta yapışkan üç sekmeli gezinme (64px yükseklik, güvenli alan payıyla).

Bugün ekranında içerik 18px üst, 14px yan dolguyla başlar, bloklar arası 14px boşluk vardır. Eylem bölgesi `margin-top: auto` ile her zaman başparmak bölgesine, gezinmenin hemen üstüne itilir. Ritim küçük adımlıdır: 6px (ölçek tuşları arası), 10px (sütun arası, satır içi), 14px (bloklar), 18px (fiş yan dolgusu). Boşluk şişirilmez; bir yemek satırı yaklaşık 11px/10px dikey dolguyla yoğundur.

Yemek satırı üç alanlı bir ızgaradır: ad, kişisel mühür, sağda iki satıra yayılan puan; altında oy sayısı. Puan ölçeği 5 sütunlu ızgaradır (1–10 iki sıra). Etkin satır, fişin yan dolgusunu negatif kenar boşluğuyla taşarak zemin rengine boyanır.

## Elevation & Depth

Bulanık gölge yoktur. Derinlik iki yolla verilir: ton farkı (soğuk zemin üstünde beyaz fiş, fiş içinde zemin renkli etkin satır) ve kıl çizgiler. Kullanılan tüm `box-shadow` değerleri sıfır bulanıklıklı çizgilerdir.

### Shadow Vocabulary
- **Fiş tabanı** (`box-shadow: 0 1px 0 var(--koparma)`): Fişin alt kenarındaki tek piksellik taban çizgisi, kâğıdın zemine oturduğunu gösterir.
- **Sütun kenarı** (`box-shadow: 0 0 0 1px var(--cizgi)`): Masaüstünde dar sütunun çevresi.
- **Seçili sekme** (`box-shadow: inset 0 3px 0 var(--vurgu)`): Etkin sekmenin üstündeki 3px altın çizgi.

### Named Rules
**The Kıl Çizgi Rule.** Gölgenin bulanıklık değeri her zaman 0'dır. Yükselti gerektiren her şey ton farkı ya da 1–4px dolu çizgiyle ifade edilir; `blur` içeren gölge, `backdrop-filter` ya da cam efekti kullanılmaz.

## Shapes

Köşeler sakin ve küçüktür: fiş, ek liste, düğmeler ve ölçek tuşları 6px (`--kose`). Damga biçimleri ayrı bir aile kurar: gün mührü tam daire (92px, 4px altın çerçeve, -12° eğik), kişisel puan mührü hap biçimi (23px yükseklik, 2px altın çerçeve, -8° eğik), "yemedim" ve durum damgaları 4px köşeli dikdörtgen (durum damgası 3px lacivert çerçeve, -6° eğik). Eğiklik yalnızca damgalara aittir; fiş, düğme ve satırlar dümdüzdür.

Fişin alt bölümü 2px kesik çizgili koparma hattıyla ayrılır (`--koparma`); bu hat yalnızca fişin kalori/künye satırının üstünde kullanılır. Satır ayraçları 1px düz çizgidir.

## Components

### Buttons
Başparmak bölgesinde, tam genişlikte, tek karar.
- **Shape:** Hafif yuvarlatılmış (6px), tam genişlik.
- **Primary:** Altın zemin, koyu lacivert metin, 58px en az yükseklik, 21px/700. Ekranda en fazla bir tane ("Yedim, puanla", "Puanlamaya devam et").
- **Hover / Focus / Active:** Basılınca `--vurgu-basili` (120ms, `--ease-out`). Odak: açık zeminde 3px lacivert dış çizgi (11.8:1), lacivert bant üstünde altın; 2px boşluk.
- **Secondary:** Saydam zemin, 2px lacivert çerçeve, lacivert metin, 52px, 18px. Basılınca lacivert dolar, metin beyaz olur. Bağlantı olarak da kullanılır ("Sıradaki günleri kaydır").
- **Metin düğmesi:** "Bunu yemedim": çerçevesiz, altı çizili, `--ikincil`, 15px/600.

### Puan Ölçeği
- **Style:** 1–10 arası on tuş, 5 sütunlu ızgara, 6px aralık; beyaz zemin, 1px `--koparma` çerçeve, 6px köşe, 50px yükseklik, 20px/700 lacivert tablo rakamı.
- **State:** Basılınca lacivert dolgu, beyaz rakam. Ölçek yalnızca etkin satırın altında açılır, üstünde `--ikincil` renkte "<yemek> kaç puan?" sorusu durur. Bir puan basıldığında ölçek sıradaki puanlanmamış yemeğe geçer.

### Cards / Containers (Fiş)
- **Corner Style:** 6px.
- **Background:** `--fis` beyazı, `--zemin` üstünde.
- **Shadow Strategy:** Yalnızca 1px taban çizgisi (bkz. Elevation & Depth).
- **Border:** Yok; satırlar 1px `--cizgi` ile, künye satırı 2px kesik `--koparma` ile ayrılır.
- **Internal Padding:** 16px 18px 14px; durum fişinde 24px 22px 26px.
- **Durum fişi:** Kapalı/yayınlanmadı günlerde aynı fiş, başlığın sağına yüzen eğik lacivert damgayla ("Kapalı", "Bekleniyor"). Altında beyaz ek liste (sıradaki menü ya da geçen ayın en iyileri).

### Navigation
- **Bant:** Yapışkan üst bant; lacivert zemin, altında 4px altın çizgi; solda beyaz "yersen" kelime işareti, sağda `--bant-ikincil` tarih (15px/600, Türkçe uzun tarih).
- **Sekmeler:** Yapışkan alt gezinme, beyaz zemin, 1px üst çizgi; üç eşit sekme (Bugün, Kaydır, Ben), 22px çizgi ikon (lucide, 2px kontur) üstte, 14px/600 etiket altta. Pasif `--ikincil`; etkin `--marka` ve üstte 3px altın iç çizgi. Odak halkası içeri alınır (-4px).

### Mühür (imza bileşeni)
- **Gün mührü:** Fişin sağ üstüne basılmış 92px altın çerçeveli daire, -12° eğik; içinde 32px/900 tablo rakamlı ağırlıklı ortalama ve 11px/700 "günün ortalaması". Fiş başlığı mühre 104px sağ pay bırakır.
- **Kişisel mühür:** Kullanıcı puan verince yemek adının yanına basılan altın çerçeveli hap, 14px/900 rakam. "Yemedim" seçildiyse aynı damga kırmızı çerçeveli, 4px köşeli ve 12px "yemedim" yazılı. Mühür ad satırının yüksekliğini aşmaz, basıldığında satırlar kaymaz.
- **Hareket:** `damga` animasyonu, 280ms, `cubic-bezier(0.16, 1, 0.3, 1)`: 1.9 kat büyük ve -26° eğik, saydam halden 1 kat ve -8° eğik hale iner; %60'ta tamamen görünür.

**The Tek Damga Rule.** Sistemin tek imza hareketi mührün fişe basılmasıdır. Başka giriş animasyonu, kayma, sıçrama ya da süsleme hareketi eklenmez; diğer geçişler yalnızca 120ms renk değişimidir. `prefers-reduced-motion: reduce` altında tüm animasyon ve geçişler 0.01ms'ye iner, mühür anında basılı görünür.

## Do's and Don'ts

### Do:
- **Do** yeni bir üniversiteyi `styles.css` içinde aynı token adlarını taşıyan yeni bir `[data-uni="<kod>"]` bloğu olarak ekle; değerleri o üniversitenin kendi sitesinin renk ailesinden türet.
- **Do** bileşen CSS'inde yalnızca `var(--marka)`, `var(--vurgu)` gibi token'ları kullan, ham hex yazma.
- **Do** altını çizgi, çerçeve ve dolgu olarak kullan; üstündeki metni `--marka-koyu` yap.
- **Do** her puanı, oyu ve numarayı Titillium Web 900 (puan) ile `tabular-nums` olarak bas; ondalıkta Türkçe virgül kullan.
- **Do** oy sayısı 5'in altındaki puanı 22px ve `--soluk` ile bas, oy sayısını her zaman yaz.
- **Do** durumları (kapalı, yayınlanmadı) boş ekran yerine damgalı bir durum fişiyle göster.
- **Do** birincil eylemi başparmak bölgesinde, tam genişlikte ve ekranda tek altın düğme olarak tut.
- **Do** derinliği ton farkı ve 0 bulanıklıklı kıl çizgilerle ver.

### Don't:
- **Don't** hiçbir temada üniversite logosu, amblemi, resmi mührü ya da kurumsal yazı biçimi kullanma.
- **Don't** altını açık zeminde metin rengi olarak kullanma.
- **Don't** bulanık gölge, `backdrop-filter` ya da cam efekti kullanma.
- **Don't** mühür dışında bir imza hareketi ekleme; mühür animasyonunu hareket azaltma tercihinde oynatma.
- **Don't** `--iptal` kırmızısını "yemedim" damgası dışında kullanma.
- **Don't** görselli yemek kartı ızgarası ya da yıldız puanı kullanma; puan 10 üzerinden rakamdır.
- **Don't** Titillium Web'i Google Fonts ya da başka bir CDN'den yükleme; `@fontsource/titillium-web` ile kendi paketinden gelsin.
- **Don't** damga dışındaki öğeleri (fiş, düğme, satır) eğme.
