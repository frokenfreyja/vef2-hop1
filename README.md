# Hópverkefni 1

## Uppsetning á verkefni

1. Búa þarf til gagnagrunn með ákveðnu heiti
2. Setja þarf upp .env skrá og færa inn eftirfarandi gildi í hana:
  * DATABASE_URL - á forminu postgres://username:password@localhost:5432/heiti
    * Username er notendanafn fyrir postgres
    * Password er lykilorð fyrir postgres
    * Heiti er heitið á gagnagrunninum
  * PORT - sem vefurinn á að vera keyrður á
  * HOST - sem vefurinn á að vera keyrður á
  * JWT_SECRET sem er leyndarmál sem notað er í undirskrift á token
  * CLOUDINARY_URL, stilling fyrir cloudinary, fengin úr cloudinary console
  * CLOUDINARY_CLOUD, stilling fyrir cloudinary, fengin úr cloudinary console
  * CLOUDINARY_API_KEY, stilling fyrir cloudinary, fengin úr cloudinary console
  * CLOUDINARY_API_SECRET, stilling fyrir cloudinary, fengin úr cloudinary console
3. Keyra þarf skipunina 'npm run setup -s' í verkefnamöppu sem setur upp töflur og setur gögn í þær
4. Keyra þarf skipunina 'npm start' í verkefnamöppu 

## Dæmi um köll í vefþjónustu

Dæmi um köll

## Innskráning

Admin er með netfangið 'admin@admin.is' og lykilorðið 'password'

Til að innskrá sig þarf að kalla á http://127.0.0.1:3000/users/login með POST

## Nöfn og notendanöfn hópmeðlima

Freyja Sigurgísladóttir - frs24@hi.is - frokenfreyja

Henrietta Þóra Magnúsdóttir - hthm6@hi.is - HennyM

Kristín María Tómasdóttir - kmt3@hi.is - krimtom
