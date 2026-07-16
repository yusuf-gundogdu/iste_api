# Demo Avatarları — sentetik (gerçek kişi DEĞİL)

Bu görseller **StyleGAN üretimi sentetik yüzlerdir** (this-person-does-not-exist.com).
Gerçek/tanınabilir bir kişiye ait DEĞİLDİR; sadece demo verisini gerçekçi göstermek
için kullanılır. Filigran kırpıldı, 400×400 kare, cinsiyet-eşleşmeli seçildi (yetişkin;
çocuk/bebek görseller elendi).

- `ustas/usta-m-01..40.jpg` — erkek usta yüzleri (40)
- `ustas/usta-f-01..18.jpg` — kadın usta yüzleri (18)
- `users/user-m-01..20.jpg` — erkek müşteri/kullanıcı yüzleri (20)
- `users/user-f-01..17.jpg` — kadın müşteri/kullanıcı yüzleri (17)

Atama `backfillAvatars()` içinde deterministik + cinsiyet-eşleşmeli yapılır
(isim `FEMALE_FIRST` havuzundaysa kadın yüzü). Harici URL yok; dosyalar repoya gömülü
ve backend statik olarak `/seed-assets/...` altında sunar.
