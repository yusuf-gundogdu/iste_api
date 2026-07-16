# Seed avatar setleri (temsili — gerçek kişi DEĞİL)

Seed'in ustalara ve müşterilere deterministik atadığı çizim avatarları.
Hepsi algoritmayla üretilmiş, **var olmayan** yüzlerdir; telifli stok
fotoğraf veya gerçek kişi görseli YOKTUR.

Kaynak: [DiceBear](https://www.dicebear.com) 9.x HTTP API ile PNG olarak
indirildi (256×256). İki farklı stil, iki farklı grup için:

| Klasör | Stil | Adet | Lisans |
|---|---|---|---|
| `ustas/` | `personas` (Draftbit) | 40 | CC BY 4.0 |
| `users/` | `notionists` (Zoish) | 40 | CC0 1.0 |

- `personas` — https://www.dicebear.com/styles/personas/ — "Personas" by
  Draftbit, lisans **CC BY 4.0**.
- `notionists` — https://www.dicebear.com/styles/notionists/ — "Notionists"
  by Zoish, lisans **CC0 1.0** (kamu malı).

Dosyalar `<prefix>-01.png … <prefix>-40.png` biçimindedir ve seed
tarafından `providerSub` hash'iyle deterministik seçilir
(`avatarUrl = "/seed-assets/avatars/ustas|users/<dosya>.png"`).
