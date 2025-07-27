# Step Validation va Navigation Test Rejasi

## 🧪 **Test 1: Vakansiya Joylash Jarayoni**

### 1.1 Boshlash

- [ ] `/start` komandasi ishlaydi
- [ ] Telefon raqam so'raladi (agar ro'yxatdan o'tmagan bo'lsa)
- [ ] Asosiy menyu ko'rsatiladi

### 1.2 Kategoriya tanlash

- [ ] "💼 Vakansiya joylash" tugmasi ishlaydi
- [ ] Kategoriyalar ro'yxati ko'rsatiladi
- [ ] Har bir kategoriya tugmasi ishlaydi

### 1.3 Step jarayoni

- [ ] Birinchi step ko'rsatiladi (Lavozim nomi)
- [ ] Majburiy maydon belgilangan
- [ ] "❌ Bekor qilish" tugmasi mavjud

### 1.4 Input validation

- [ ] Bo'sh xabar yuborish bloklanadi
- [ ] 500 belgidan uzun xabar bloklanadi
- [ ] Telegram username validation ishlaydi
- [ ] Telefon raqam validation ishlaydi
- [ ] URL validation ishlaydi

### 1.5 Step navigation

- [ ] Majburiy maydonlarni o'tkazib yuborish mumkin emas
- [ ] Ixtiyoriy maydonlarni o'tkazib yuborish mumkin
- [ ] Har stepda "❌ Bekor qilish" tugmasi mavjud

### 1.6 Jarayon bloklash

- [ ] Step jarayonida boshqa tugmalar ishlamaydi
- [ ] "⚠️ Avval joriy jarayonni tugatishingiz kerak!" xabari ko'rsatiladi
- [ ] Faqat "❌ Bekor qilish" tugmalari ishlaydi

## 🧪 **Test 2: Xizmat Joylash Jarayoni**

### 2.1 Boshlash

- [ ] "⚙️ Xizmat joylash" tugmasi ishlaydi
- [ ] Tariflar ro'yxati ko'rsatiladi

### 2.2 Tarif tanlash

- [ ] Har bir tarif tugmasi ishlaydi
- [ ] Tanlangan tarif ko'rsatiladi
- [ ] "✅ Davom etish" tugmasi ishlaydi

### 2.3 Step jarayoni

- [ ] Birinchi step ko'rsatiladi (Xizmat nomi)
- [ ] Majburiy maydonlar belgilangan
- [ ] "❌ Bekor qilish" tugmasi mavjud

### 2.4 Input validation

- [ ] Bo'sh xabar yuborish bloklanadi
- [ ] 500 belgidan uzun xabar bloklanadi
- [ ] Telefon raqam validation ishlaydi
- [ ] URL validation ishlaydi (Portfolio/Website)

### 2.5 Step navigation

- [ ] Majburiy maydonlarni o'tkazib yuborish mumkin emas
- [ ] Har stepda "❌ Bekor qilish" tugmasi mavjud

## 🧪 **Test 3: Validation Testlari**

### 3.1 Telegram Username

- [ ] `@username` - ✅ To'g'ri
- [ ] `username` - ✅ To'g'ri (avtomatik @ qo'shiladi)
- [ ] `@user` - ❌ Noto'g'ri (5 belgidan kam)
- [ ] `@user@name` - ❌ Noto'g'ri (maxsus belgilar)
- [ ] `@user name` - ❌ Noto'g'ri (bo'sh joy)

### 3.2 Telefon raqam

- [ ] `+998 90 123 45 67` - ✅ To'g'ri
- [ ] `998901234567` - ✅ To'g'ri (avtomatik formatlanadi)
- [ ] `901234567` - ✅ To'g'ri (avtomatik +998 qo'shiladi)
- [ ] `+998 90 123 45 6` - ❌ Noto'g'ri (7 raqam)
- [ ] `+998 90 123 45 678` - ❌ Noto'g'ri (8 raqam)

### 3.3 URL

- [ ] `https://example.com` - ✅ To'g'ri
- [ ] `http://example.com` - ✅ To'g'ri
- [ ] `example.com` - ❌ Noto'g'ri (protocol yo'q)
- [ ] `not-a-url` - ❌ Noto'g'ri

## 🧪 **Test 4: Navigation Testlari**

### 4.1 Step jarayonida bloklash

- [ ] Vakansiya step jarayonida boshqa tugmalar ishlamaydi
- [ ] Xizmat step jarayonida boshqa tugmalar ishlamaydi
- [ ] Telefon raqam kutilayotganda boshqa tugmalar ishlamaydi

### 4.2 Bekor qilish

- [ ] Har stepda "❌ Bekor qilish" tugmasi ishlaydi
- [ ] Bekor qilgandan keyin asosiy menyuga qaytadi
- [ ] State tozalangan

### 4.3 O'tkazib yuborish

- [ ] Ixtiyoriy maydonlarni o'tkazib yuborish mumkin
- [ ] Majburiy maydonlarni o'tkazib yuborish mumkin emas
- [ ] Xabar ko'rsatiladi

## 🧪 **Test 5: Xatoliklar**

### 5.1 Network xatoliklari

- [ ] MongoDB ulanish yo'q bo'lganda xabar ko'rsatiladi
- [ ] Bot API xatoliklarida retry ishlaydi
- [ ] Timeout xatoliklari to'g'ri boshqariladi

### 5.2 Input xatoliklari

- [ ] Noto'g'ri formatdagi ma'lumotlar bloklanadi
- [ ] Xatolik xabarlari to'g'ri ko'rsatiladi
- [ ] Qayta urinish imkoniyati beriladi

## 🧪 **Test 6: Admin Panel**

### 6.1 Statistika

- [ ] `/admin-panel` komandasi ishlaydi
- [ ] Barcha statistika ko'rsatiladi
- [ ] Foydalanuvchilar ro'yxati pagination bilan ishlaydi

### 6.2 Top foydalanuvchilar

- [ ] Eng ko'p vakansiya yuborganlar
- [ ] Eng ko'p xizmat yuborganlar
- [ ] Eng muvaffaqiyatli foydalanuvchilar

## 📋 **Test Natijalari**

### ✅ Muvaffaqiyatli testlar:

- [ ] Barcha step validation ishlaydi
- [ ] Navigation to'g'ri bloklanadi
- [ ] Input validation ishlaydi
- [ ] Xatoliklar to'g'ri boshqariladi

### ❌ Xatoliklar:

- [ ] Qaysi testlar muvaffaqiyatsiz bo'ldi
- [ ] Qanday muammolar topildi

## 🔧 **Tuzatishlar**

Agar testlar muvaffaqiyatsiz bo'lsa:

1. Loglarni tekshiring: `pm2 logs post-vacancy-bot`
2. Bot statusini tekshiring: `pm2 status`
3. Health check: `curl http://localhost:7777/health`

---

**Eslatma:** Bu testlar barcha asosiy funksiyalarni qamrab oladi. Har bir testni alohida bajarib, natijalarni qayd eting.
