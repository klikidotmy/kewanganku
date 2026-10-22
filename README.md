# KewanganKu

PWA kewangan peribadi. Data disimpan dalam Google Sheet sendiri melalui Apps Script. Repo ni tak simpan sebarang data kewangan: URL Apps Script dan token disimpan dalam pelayar telefon sahaja.

## Ciri

- Tambah transaksi dengan keypad: belanja, masuk, pindah antara akaun
- Akaun debit, kad kredit dan PayLater (dengan baki had), pinjaman, pelaburan, dan nilai bersih
- Komitmen bulanan dengan checklist bayar / belum bayar
- Bajet ikut kategori dan ringkasan ikut kumpulan
- Kemas kini baki sebenar akaun (direkod sebagai pelarasan, bukan belanja)
- Berfungsi offline: perubahan disimpan dan sync bila online semula
- Mod privasi untuk kaburkan angka

## Setup backend (sekali sahaja)

1. Buka Google Sheet **KewanganKu DB**, pergi ke Extensions > Apps Script.
2. Padam kod contoh, tampal isi `apps-script/Code.gs`, simpan.
3. Pilih fungsi `setup` dan tekan Run. Luluskan kebenaran. Salin token dari Execution log.
4. Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Deploy dan salin URL yang berakhir dengan `/exec`.
5. Buka app, tampal URL dan token, tekan Sambung.

Kemas kini kod Apps Script nanti: Deploy > Manage deployments > edit > Version: New version. Jangan buat New deployment, sebab URL akan bertukar.

Kalau token bocor, jalankan `rotateToken()` dan masukkan token baru dalam app.

## Struktur Sheet

| Tab | Isi |
|---|---|
| Transactions | id, date, type (expense / income / transfer / adjust), amount, account_id, to_account_id, category_id, commitment_id, note, source, created_at, updated_at |
| Accounts | id, name, type, group (debit / credit / borrowed / invest), last4, opening_balance (hutang negatif), credit_limit, color, order, archived, note |
| Categories | id, name, kind, group, icon, budget, order, archived |
| Commitments | id, name, amount, due_day, category_id, account_id, start_month, end_month, active, note |
| Settings | opening_date: transaksi sebelum tarikh ni disimpan sebagai sejarah dan tak ubah baki akaun |
