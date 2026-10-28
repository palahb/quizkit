<p align="center">
  <img src="assets/images/icon.png" width="96" alt="Quizkit simgesi: iki kitap ve bir onay işareti">
</p>

<h1 align="center">Quizkit</h1>

<p align="center">Kendi çalışma materyalin için çevrimdışı test uygulaması.<br>
<a href="README.md">English</a></p>

---

Notlarını, PDF'lerini ya da çıkmış soruları ChatGPT veya Claude ile teste dönüştür, JSON olarak içe aktar ve her yerde çöz. İnternet yok, hesap yok, hiçbir şey telefonundan çıkmaz.

Quizkit, Açıköğretim (AÖF) çıkmış sorularını metroda çözebilmek için başladı, ama her konu için çalışır.

## Özellikler

- **Yapıştırarak ya da `.json` dosyası seçerek içe aktarma.** Hatalar anlaşılır biçimde gösterilir: soru numarası, satır ve sütun, hatalı metnin kendisi. Yapay zekânın sık yaptığı hatalar (JSON'un etrafındaki açıklamalar, tek ters eğik çizgili LaTeX, metin içindeki tırnaklar) bir uyarıyla kendiliğinden düzeltilir.
- **Bütün bir ders tek dosyada.** Tek bir JSON, iç içe klasörlerde onlarca test taşıyabilir. Kaydetmeden önce önizleme neyin yeni olduğunu, neyin zaten var olduğunu ve neyin hatalı olduğunu gösterir.
- **İki mod.** Alıştırma modu her sorudan sonra doğru/yanlışı ve açıklamayı gösterir. Sınav modu sessizdir, kronometre çalışır, her şey sonda açıklanır.
- **Yanlışlardan öğren.** Bütün cevapları incele, yalnızca yanlışlarını tekrar çöz, geçmişine bak.
- **Matematik.** Sorularda, şıklarda ve açıklamalarda LaTeX formülleri (`$...$` ve `$$...$$`), KaTeX ile çevrimdışı gösterilir.
- **Klasörler, Türkçe ve İngilizce arayüz, koyu mod.**
- **Tamamen çevrimdışı ve özel.** Ağ isteği yok, hesap yok, istatistik toplama yok. Her şey cihazda saklanır.

## Yapay zekâyla test hazırlamak

Quizkit soruları kendisi üretmez. Bir yapay zekâya, ona biçimi öğreten hazır bir promptla yaptırırsın:

1. Uygulamadaki **Promptlar** sekmesinden ya da [**docs/prompts**](docs/prompts/README.md) sayfasından bir prompt seç.
2. Materyalinle birlikte ChatGPT'ye, Claude'a ya da başka bir yapay zekâya yapıştır.
3. Gelen cevabı Quizkit'in **İçe aktar** ekranına yapıştır ya da `.json` dosyası olarak kaydet.

Notlar ve PDF'ler, çıkmış sorular, klasörlü bütün bir ders, matematik, terim ve tanımlar, kaynaksız bir konu ve hatalı JSON'u düzelttirmek için promptlar var. Hepsi Türkçe ve İngilizce.

Biçimin açıklaması [docs/format.tr.md](docs/format.tr.md) dosyasında, içe aktarmaya hazır örnekler [examples/](examples/) klasöründe. JSON'u bilgisayarda yazıp ya da ürettirip dosyayı telefona da gönderebilirsin.

En basit test şöyle görünür:

```json
{
  "schemaVersion": 1,
  "title": "Uluslararası İşletmecilik – Ara Sınav 2023",
  "questions": [
    {
      "question": "İşletmenin faaliyetlerini yürüttüğü yabancı ülkeye ne ad verilir?",
      "options": ["Bağlı ülke", "Ev sahibi ülke", "Ana ülke", "Üçüncü ülke", "Yatırımcı ülke"],
      "answer": "B",
      "explanation": "İşletmenin merkezi dışında faaliyet yürüttüğü yabancı ülkeye ev sahibi ülke denir."
    }
  ]
}
```

## Çalıştırmak

Quizkit App Store'da yok. Kaynak koddan çalıştırmak için:

```bash
git clone https://github.com/palahb/quizkit.git
cd quizkit
npm install
npx expo start
```

Sonra QR kodunu [Expo Go](https://expo.dev/go) uygulamasıyla tara. Gerçek bir iPhone'da Expo Go, ücretsiz bir Expo hesabıyla hem uygulamada hem bilgisayarda (`npx expo login`) giriş yapmayı ister.

Gerekenler: Node.js 22 ya da üstü ve SDK 58 için Expo Go.

## Geliştirme

Komutlar, kullanılan teknolojiler ve klasör yapısı için [İngilizce README'nin Development bölümüne](README.md#development) bak. Önemli bir not: `docs/prompts`, `docs/format*.md` ve `examples/` dosyaları `src/domain/prompts.ts` dosyasından üretilir. Promptları orada değiştirip `npm run build:docs` çalıştır; dosyalar uyuşmazsa bir test başarısız olur.

## Lisans

[MIT](LICENSE)
