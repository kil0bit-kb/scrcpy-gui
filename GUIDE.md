# 📖 ScrcpyGUI v4 - Kullanıcı Kılavuzu

Bu kılavuz; ilk kurulumdan gelişmiş özelliklerin kullanımına kadar ScrcpyGUI hakkında bilmeniz gereken her şeyi içerir.

---

## 📋 İçindekiler

1. [Gereksinimler](#-gereksinimler)
2. [Kurulum Kılavuzu](#-kurulum-kılavuzu)
3. [Android Cihaz Kurulumu](#-android-cihaz-kurulumu)
4. [Cihazınızı Bağlama](#-cihazınızı-bağlama)
5. [Özellik Kılavuzu](#-özellik-kılavuzu)
6. [Sorun Giderme](#-sorun-giderme)

---

## 🛠 Gereksinimler

ScrcpyGUI'yi kullanmaya başlamadan önce aşağıdakilere sahip olduğunuzdan emin olun:
* **Android Cihaz:** Android 5.0 veya üzeri bir sürüm (Kamera Modu için Android 12+, Masaüstü Modu için Android 11+ gereklidir).
* **USB Kablosu:** Yüksek kaliteli bir veri kablosu (sadece şarj eden kablolardan kaçının).
* **Bilgisayar:** Windows, macOS veya Linux.
* **Scrcpy Dosyaları (Binaries):** Uygulama bunları sizin için otomatik olarak indirebilir, ancak isterseniz kendi dosyalarınızı da tanıtabilirsiniz.

---

## 🚀 Kurulum Kılavuzu

### 🪟 Windows
1. Releases (Sürümler) sayfasından en son `.exe` veya `.msi` dosyasını indirin.
2. Kurulum dosyasını veya taşınabilir (standalone) uygulamayı çalıştırın.
* **Akıllı Kurulum:** İlk açılışta ScrcpyGUI, bilgisayarınızda `scrcpy` kurulu olup olmadığını tespit eder. Eğer bulamazsa, tek tıkla indirmeniz için bir seçenek sunar.
* **Otomatik Güncellemeler:** ScrcpyGUI v4 her açıldığında, kurulu sürümünüzü Genymobile'ın en son resmi sürümüyle otomatik olarak karşılaştırır ve yeni bir sürüm varsa sizi şık bir güncelleme penceresiyle bilgilendirir.

### 🍎 macOS
1. İşlemci mimarinize uygun olan `.dmg` dosyasını indirin (Intel veya Apple Silicon/M1/M2).
2. ScrcpyGUI simgesini **Uygulamalar (Applications)** klasörünüze sürükleyin.
* **Güvenlik Notu:** Uygulama Apple tarafından dijital olarak imzalanmadığı için şu adımları takip etmeniz gerekebilir:
  1. *Sistem Ayarları > Gizlilik ve Güvenlik* bölümüne gidin.
  2. "Güvenlik" başlığı altına kaydırın ve *Yine de Aç (Open Anyway)* seçeneğine tıklayın.

### 🐧 Linux
1. `.AppImage` veya `.deb` paketini indirin.
* **AppImage Kullanımı:** Dosyaya sağ tıklayın -> *Özellikler -> İzinler -> Dosyanın bir program gibi çalıştırılmasına izin ver*. Ardından çalıştırmak için çift tıklayın.
* **Bağımlılıklar:** Herhangi bir sorunla karşılaşırsanız aşağıdaki gerekli paketlerin kurulu olduğundan emin olun:
  ```bash
  sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev

  📱 Android Cihaz Kurulumu
ScrcpyGUI'nin telefonunuzla iletişim kurabilmesi için telefonunuzda Geliştirici Seçenekleri ve USB Hata Ayıklama modlarını etkinleştirmeniz gerekir.

1. Geliştirici Seçeneklerini Etkinleştirme
Android cihazınızda Ayarlar uygulamasını açın.

Telefon Hakkında bölümüne gidin (genellikle en alttadır).

Derleme Numarası (Build Number) seçeneğini bulun ve ardı ardına 7 kez tıklayın.

Ekranda "Artık bir geliştiricisiniz!" şeklinde küçük bir bildirim (toast) göreceksiniz.

2. USB Hata Ayıklamayı Etkinleştirme
Ana Ayarlar menüsüne geri dönün.

Sistem > Geliştirici Seçenekleri yolunu izleyin (veya arama çubuğuna yazın).

USB Hata Ayıklama seçeneğini bulun ve aktif hale getirin.

Fare/Klavye İçin Önemli: Eğer cihazınızda varsa "USB üzerinden yükle" veya "USB Hata Ayıklama (Güvenlik Ayarları)" seçeneklerini de mutlaka etkinleştirin.

🌐 Cihazınızı Bağlama
USB Bağlantısı (Önerilen)
Telefonunuzu USB kablosuyla bilgisayarınıza bağlayın.

Telefon ekranında "USB Hata Ayıklamasına izin verilsin mi?" uyarısı çıkacaktır.

"Bu bilgisayardan her zaman izin ver" seçeneğini işaretleyin ve İzin Ver'e dokunun.

Cihazınız ScrcpyGUI üzerinde otomatik olarak görünmezse, üst menüdeki Yenile (Refresh) butonuna tıklayın.

Kablosuz Bağlantı (Android 11+)
Telefonunuzun ve bilgisayarınızın aynı Wi-Fi ağına bağlı olduğundan emin olun.

Geliştirici Seçeneklerinden Kablosuz Hata Ayıklama modunu açın.

Ayarlarına girmek için "Kablosuz Hata Ayıklama" metninin üzerine dokunun.

ScrcpyGUI'de yan menüdeki 🌐 Wireless Connect (Kablosuz Bağlantı) butonuna tıklayın.

Telefonunuzda "Cihazı eşleştirme koduyla eşleştir" seçeneğine dokunun.

Telefonunuzda görünen IP Adresini, Portu ve Eşleştirme Kodunu ScrcpyGUI'deki ilgili alanlara girin.

Eşleştirme tamamlandığında ScrcpyGUI, gelecekteki tek tıkla bağlantılar için cihazınızı hatırlayacaktır!

🎮 Özellik Kılavuzu
⌨️ HID Klavye & Fare (OTG Modu)
ScrcpyGUI v4, gecikmesiz bir deneyim için gelişmiş donanım simülasyonu (HID) teknolojisine sahiptir.

HID Klavye: Gerçek bir USB klavyeyi simüle eder. Türkçe karakterler, özel işaretler ve uluslararası klavye düzenlerinde yaşanan sorunları çözmenin tek yolu budur.

HID Fare: Yüksek hassasiyetli ve yerel bir imleç hissi sağlar. Standart ekran yansıtmadaki "çift imleç" veya gecikme sorununu tamamen ortadan kaldırır.

Saf HID (Ekran Yansıtmasız): Bilgisayarınızı sadece telefonunuz için bir "kumanda/kontrolcü" olarak kullanmak istediğiniz anlar için mükemmeldir (örneğin telefon ekranına bakarak uzun mesajlar yazmak veya oyun oynamak için).

📹 Profesyonel Kamera Modu (Webcam)
Telefonunuzu profesyonel, donanım kontrollü bir web kamerasına dönüştürün.

Yansıtma Kaynağını (Capture Source) Camera (Kamera) olarak değiştirin.

Lensleri Yenile (Refresh Lenses): Butona tıkladığınızda ScrcpyGUI telefonunuzu anında tarar ve tüm fiziksel kamera lenslerini, desteklenen çözünürlükleri ve yakınlaştırma aralıklarını geniş bir açılır menüde listeler.

Kamera Seçimi: Listeden dilediğiniz lensi (Ultra Geniş Açı, Ön Kamera veya Ana Arka Kamera) seçin.

Geliştirilmiş Kontroller:

Kamera Flaşı (Torch): Cihazınızın fiziksel flaşını doğrudan arayüzden açıp kapatın.

Kamera Yakınlaştırma (Zoom): Çekim açınızı mükemmel şekilde ayarlamak için dinamik yakınlaştırma kaydırıcısını (1.0x - 5.0x) kullanın.

Güvenli Çözünürlük (Failsafe): Standart yüksek megapikselli telefon lensleri, donanım video kodlayıcı sınırları nedeniyle orijinal 4:3 fotoğraf çözünürlüklerinde (örn. 4080x3060) başlatıldığında scrcpy'yi çökertebilir. ScrcpyGUI seçtiğiniz çözünürlüğü otomatik olarak haritalandırır ve çökmeleri önlemek için varsayılan olarak güvenli 1080p standart boyutuna (1920x1080) sadık kalır.

FPS: Cihazınızın kendi yakalama hızında çalışması için Auto (Önerilen) olarak bırakın veya 30 FPS'yi seçin.

OBS Entegrasyonu: OBS Studio'yu açın, bir "Pencere Yakalama" kaynağı ekleyin ve ScrcpyGUI penceresini seçin. Telefonunuzu Zoom, Teams veya Discord'da kullanmak için OBS'in Sanal Kamerasını (Virtual Camera) aktif hale getirebilirsiniz.

🖥️ Masaüstü Modu (Sanal Ekran)
Android cihazınızı ikincil bir çalışma alanına veya sanal bir monitöre dönüştürün.

Yansıtma Kaynağını (Capture Source) Desktop (Masaüstü) olarak değiştirin.

Esnek Ekran (Flex Display): Bu özelliği açtığınızda, bilgisayarınızdaki scrcpy penceresinin kenarlarını sürükleyip yeniden boyutlandırmak, telefonunuzun sanal ekran çözünürlüğünü ve en boy oranını anında dinamik olarak ölçeklendirir. Siyah kenarlıklar olmadan pencereye tam oturur.

Arka Plan Rengi: Canlı renk önizleme kutucuğunu kullanarak veya bir HEX kodu (örn. #2b2d42) yazarak pencere kenarlıklarının veya sinemaskop şeritlerinin rengini özelleştirin.

Aktif Tut (Keep Active): Yansıtma oturumları sırasında genel cihaz ayarlarını değiştirmek zorunda kalmadan sanal ekranın kapanmasını veya uyku moduna geçmesini önlemek için bu özelliği etkinleştirin.

🖥 Grafik Oluşturucu (Render API)
Scrcpy'nin video ekranı için hangi grafik oluşturucu altyapısını talep edeceğini seçebilirsiniz.

Auto (Otomatik): Önerilen varsayılandır. En iyi oluşturucuyu scrcpy'nin seçmesine izin verir.

Manuel Seçim: Sistem yeteneklerinize göre Direct3D, OpenGL, OpenGL ES, Metal veya Software seçenekleri görünebilir.

İşletim Sistemine Duyarlı Filtreleme: ScrcpyGUI, bilgisayarınızda kurulu olan scrcpy sürümünün neleri desteklediğini okur ve bunları işletim sisteminize göre filtreler. Desteklenmeyen seçenekler otomatik olarak gizlenir (örneğin Metal seçeneği yalnızca macOS üzerinde gösterilir).

📂 Dosya Transferleri ve APK Kurulumu
Uygulama Kurma: Bilgisayarınızdan herhangi bir .apk dosyasını sürükleyip ScrcpyGUI penceresinin herhangi bir yerine bırakmanız yeterlidir.

Dosya Gönderme: Herhangi bir dosyayı pencereye sürükleyip bıraktığınızda, dosya otomatik olarak cihazınızın /sdcard/Download/ klasörüne gönderilir.

🔧 Sorun Giderme
Cihaz bulunamadı mı?: Farklı bir USB bağlantı noktası veya kablo deneyin. "USB Hata Ayıklama" modunun hala aktif olduğundan emin olun.

Görüntüde gecikme (lag) mi var?: Bit hızını (Bitrate) düşürün (8M-12M arası genellikle idealdir) veya Çözünürlüğü azaltın.

ADB Hatası mı alıyorsunuz?: Komutlar yanıt vermiyorsa yan menüdeki Kill ADB butonuna tıklayın. Bu işlem, uygulamayı kapatmadan bağlantı köprüsünü sıfırlayacaktır.

Dosya (Binary) Hatası mı var?: Uygulama scrcpy dosyasını bulamadığını belirtiyorsa, sağ üst köşedeki İndiriciyi (Downloader) kullanarak gerekli dosyaları edinin.
