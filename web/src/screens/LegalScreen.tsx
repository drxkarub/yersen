import "./Screens.css";

/** Veri sorumlusuna ulaşma adresi. Geliştirici onaylayınca doldurulur; boşsa "Ben" sekmesindeki yol tarif edilir. */
const CONTACT_EMAIL = "burakozsoy@trakya.edu.tr";
const UPDATED = "17 Kasım 2026";

/** Hakkında, kullanım şartları ve KVKK aydınlatma metni. Giriş yapmadan da okunabilir (#hakkinda). */
export function LegalScreen() {
  return (
    <main className="bugun yasal">
      <article className="fis metin">
        <h1>Hakkında ve kurallar</h1>
        <p className="form-aciklama">Son güncelleme: {UPDATED}</p>

        <h2>yersen nedir</h2>
        <p>
          yersen, Trakya Üniversitesi Merkez Kampüsler yemekhanesinin menüsünü gösteren ve öğrencilerin yemekleri puanladığı bir öğrenci
          projesidir. <strong>Trakya Üniversitesi ile resmi bir bağı yoktur;</strong> üniversite adına konuşmaz, menü üniversitenin
          sitesinden otomatik alınır ve hatalı olabilir. Asıl menü için yemekhaneye ve üniversitenin sitesine bakın.
        </p>

        <h2>Kullanım şartları</h2>
        <ul>
          <li>yersen'e davetle girilir. Her davet kodu bir kişi içindir; kodunu kime verdiğinden sen sorumlusun.</li>
          <li>Kişi başına tek hesap. Birden fazla hesapla oy vermek yasaktır; tespit edilirse hesaplar ve davet ettikleri kapatılabilir.</li>
          <li>Puanlar ve yorumlar kişisel görüştür; yersen'in ya da üniversitenin görüşü değildir.</li>
          <li>
            Bir kişiyi (öğrenci, aşçı, personel, kim olursa) hedef alan, taciz eden ya da kavga çıkarmak için yazılan içerik silinir ve
            yazanın hesabı kapatılır.
          </li>
          <li>
            <strong>Görseller temsilidir.</strong> Kaydırırken gördüğün yemek fotoğrafları "beklenen yemek görseli"dir: çoğu Wikimedia
            Commons'tan serbest lisanslı fotoğraflardır, yemekhanenin tabağı değildir. Her görselde yazarı ve lisansı yazar.
          </li>
          <li>Hizmet olduğu gibi sunulur; kesinti, hatalı menü ya da veri kaybı olabilir. Kurallar değişirse bu sayfa güncellenir.</li>
        </ul>

        <h2>KVKK aydınlatma metni</h2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, yersen'in geliştiricisi veri sorumlusu olarak hangi verileri neden
          işlediğini burada açıklar.
        </p>
        <h3>İşlenen veriler</h3>
        <ul>
          <li>
            <strong>Google hesabından:</strong> adın, e-posta adresin ve profil fotoğrafının bağlantısı. Yalnızca giriş için kullanılır;
            adın ve e-postan diğer kullanıcılara hiçbir yerde gösterilmez.
          </li>
          <li>
            <strong>Senin girdiğin:</strong> takma adın, kaydırma kararların (yerim/yemem/belki) ve puanların. Takma adın ve puanların
            ortalamaya katkın diğer kullanıcılara görünür; kimin hangi puanı verdiği onlara görünmez. Yalnızca yönetici, hata ve
            kötüye kullanım ayıklamak için hangi takma adın kaç puan verdiğini görebilir.
          </li>
          <li>
            <strong>Davet bilgisi:</strong> seni kimin davet ettiği ve senin kimi davet ettiğin. Çoklu hesabı önlemek için tutulur.
          </li>
          <li>
            <strong>Teknik:</strong> oturum bilgisi (IP adresi ve tarayıcı bilgisi, oturum süresince) ve kötüye kullanımı önlemek için son
            bir saatteki işlem sayıları.
          </li>
        </ul>
        <h3>Amaç ve hukuki sebep</h3>
        <p>
          Veriler hizmetin sunulması (giriş, puanlama, davet sistemi) ve kötüye kullanımın önlenmesi için, KVKK m.5/2-c (sözleşmenin
          kurulması ve ifası) ve m.5/2-f (meşru menfaat) kapsamında işlenir. Reklam, profilleme ya da satış yoktur.
        </p>
        <h3>Aktarım</h3>
        <p>
          Veriler kiralık bir sunucuda tutulur. Giriş için Google'ın, siteye erişim için Cloudflare'in altyapısı kullanılır; bu
          hizmetler yurt dışında da veri işleyebilir. Veriler başka hiçbir üçüncü kişiyle paylaşılmaz.
        </p>
        <h3>Saklama süresi</h3>
        <p>Veriler hesabın açık olduğu sürece saklanır. Oturumlar en geç 60 gün, işlem sayıları bir saat sonra silinir.</p>
        <h3>Hakların</h3>
        <p>
          KVKK m.11 kapsamında verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini ya da silinmesini isteme ve diğer haklarını
          kullanabilirsin. <strong>Hesabını ve tüm verilerini "Ben" sekmesindeki "Hesabımı sil" ile kendin silebilirsin;</strong> silme
          geri alınamaz.{" "}
          {CONTACT_EMAIL ? (
            <>
              Diğer talepler için: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </>
          ) : (
            <>Diğer talepler için seni davet eden kişi üzerinden geliştiriciye ulaşabilirsin.</>
          )}
        </p>
      </article>
      <div className="eylem">
        <a className="dugme dugme-ikincil dugme-baglanti" href="#bugun">
          Geri dön
        </a>
      </div>
    </main>
  );
}
