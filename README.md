<p align="center">
  <img src="icon.png" width="128" height="128" alt="ScrcpyGUI Icon">
  <br>
  <h1>ScrcpyGUI v4</h1>
  <strong>Üstün performanslı, birinci sınıf bir Android kontrol deneyimi.</strong>
</p>

<p align="center">
  <img width="850" alt="ScrcpyGUI Interface" src="https://github.com/user-attachments/assets/a416fcd3-295a-4a01-8769-6f9da429b028" />
</p>


---

# ScrcpyGUI v4 (Türkçe Dil Destekli Fork) 🚀

ScrcpyGUI v4; Tauri v2, React 19 ve Rust kullanılarak sıfırdan inşa edilmiş, scrcpy için modern ve özelliklerle dolu bir grafiksel kullanıcı arayüzüdür (GUI). Android cihazınızı oyun, geliştirme ve içerik üretimi için profesyonel bir araca dönüştürür.

> 🌐 **Not:** Bu depo, orijinal projenin **Türkçe dil desteği eklenmiş** ve Türk kullanıcıları için optimize edilmiş sürümüdür.

---

## 🚀 Temel Özellikler

* **✨ En İyi Görünüşlü GUI:** Pürüzsüz animasyonlar, premium bir görünüm ve his sunan çarpıcı, modern bir arayüz.
* **🎨 Özel Tema Motoru:** Çalışma alanınıza uyum sağlayacak el yapımı 5 premium tema: *Ultraviolet, Astro, Carbon, Emerald ve Bloodmoon*.
* **🔄 Otomatik Dosya (Binary) Güncellemeleri:** Yerel `scrcpy` dosyalarınızın Genymobile'ın en son resmi sürümüne göre güncel olup olmadığını otomatik kontrol eden ve tek tıkla güncelleme sunan derinlemesine entegre sistem.
* **🎮 Hassas Girdi (OTG):**
  * **HID Klavye:** Uluslararası klavye düzenleri ve özel karakterler için yerel donanım simülasyonu.
  * **HID Fare:** "Yerel masaüstü" hissi için sıfır gecikmeli, yüksek hassasiyetli imleç kontrolü.
* **🖥️ Grafik Oluşturucu (Renderer) Seçimi:** İşletim sisteminize göre filtrelenmiş ve donanım yeteneklerine duyarlı *Direct3D, OpenGL, OpenGL ES, Metal veya Software* oluşturucu altyapılarından istediğinizi seçin.
* **🌐 Kesintisiz Bağlantı:**
  * **Kablosuz Eşleştirme:** Android 11+ kablosuz eşleştirmeleri için yerel kullanıcı arayüzü.
  * **Bağlantı Geçmişi:** Kablosuz cihazları hatırlayın ve tek tıkla yeniden bağlanın.
* **📹 Profesyonel Kamera Modu (Webcam):**
  * **Lensleri Yenile:** Tüm fiziksel kamera sensörlerini, çözünürlüklerini ve yakınlaştırma aralıklarını otomatik olarak taramak ve listelemek için tek tıkla tarama.
  * **Fener ve Yakınlaştırma (Torch & Zoom):** Cihazınızın flaşını açıp kapatın veya yakınlaştırma seviyesini (1.0x - 5.0x) yerel olarak ayarlayın.
  * **Güvenli Kamera Boyutu (Failsafe Camera-Size):** Yüksek megapikselli cihazlarda donanım kodlayıcı (encoder) çökmelerini önlemek için çözünürlükleri otomatik olarak haritalandırır ve güvenli 1080p boyutlarına sadık kalır.
* **🖥️ Masaüstü Modu (Sanal Ekran):**
  * **Flex Display:** Sanal masaüstü pencerenizi dinamik olarak istediğiniz gibi sürükleyin ve anında yeniden boyutlandırın!
  * **Arka Plan Renkleri:** Scrcpy kenarlık ve sinemaskop (letterbox) renklerini HEX kodları ve canlı renk paletiyle özelleştirin.
  * **Aktif Tut (Keep Active):** Genel cihaz ayarlarını değiştirmeden, cihazın uyku moduna geçmesini engelleyen periyodik etkinlik simülatörü.
* **📁 Akıcı Dosya Yönetimi:** Doğrudan `/sdcard/Download/` dizinine sürükle-bırak yöntemiyle APK yükleme veya dosya gönderme.
* **🖼️ Premium Kullanıcı Deneyimi (UX):**
  * **Açılış Ekranı (Splash Screen):** Sıfır kırpışmalı, seçtiğiniz temayla uyumlu açılış deneyimi.
  * **Akıllı Klasör Seçici:** Klasörlere göz atarken otomatik olarak yerel scrcpy-bin veya uygulama yürütülebilir dizinlerine geri döner.

---

## 📖 Başlangıç

USB Hata Ayıklamayı nasıl etkinleştireceğinizi, Kablosuz Eşleştirmeyi nasıl ayarlayacağınızı veya gereksinimleri nasıl yükleyeceğinizi öğrenmek için lütfen kapsamlı kılavuzumuzu okuyun:
👉 [Kapsamlı Kullanıcı Kılavuzunu Görüntüle (GUIDE.md)](GUIDE.md)

---

## 🛠️ Geliştirme ve Derleme

### Gereksinimler
* Node.js (v18+)
* Rust & Cargo
* [Tauri v2 Gereksinimleri](https://v2.tauri.app/start/prerequisites/)

### Derleme Talimatları

npm install
npm run tauri dev   # Geliştirme Modu
npm run tauri build # Üretim/Dağıtım Sürümü (Production)
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*ScrcpyGUI is an independent project and is not affiliated with Genymobile or scrcpy authors.*

❄️ NixOS Kurulumu (flakes)
Sisteminize bir masaüstü başlatıcı ile kalıcı olarak kurmak için flake'i sisteminizin flake.nix dosyasına ekleyin:

Nix
inputs.scrcpy-gui.url = "github:MaximusPrime77/scrcpy-gui";
Ardından sistem paketlerinize ekleyin:

Nix
environment.systemPackages = [
  inputs.scrcpy-gui.packages.${pkgs.system}.default
];
💖 Projeyi Destekleyin
ScrcpyGUI günlük iş akışınıza yardımcı oluyorsa, orijinal geliştiriciyi Patreon üzerinden desteklemeyi düşünebilirsiniz. Desteğiniz projenin canlı ve bağımsız kalmasını sağlar!

🙏 Teşekkürler / Emeği Geçenler
ScrcpyGUI, aşağıdaki harika açık kaynaklı projeler sayesinde hayata geçirilmiştir:

scrcpy: Ultra hızlı çekirdek motor.

Tauri: Masaüstü uygulaması için güvenli ve hafif çerçeve (framework).

Lucide Icons: Temiz ve tutarlı ikon tasarımı için.

React: Modern ve etkileşimli arayüzün arkasındaki güç.

📜 Lisans
Bu proje MIT Lisansı altında lisanslanmıştır - detaylar için LICENSE dosyasına göz atabilirsiniz.

ScrcpyGUI bağımsız bir projedir; Genymobile veya scrcpy yazarları ile hiçbir resmi bağı veya ortaklığı yoktur.


---
