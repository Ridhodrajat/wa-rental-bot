import { containsLink, containsPhoneNumber } from '../src/utils/moderationDetect';

describe('containsLink', () => {
  it('mendeteksi tautan berskema', () => {
    expect(containsLink('cek https://tokosaya.com/promo')).toBe(true);
    expect(containsLink('beli di http://bit.ly/abc123')).toBe(true);
  });

  it('mendeteksi tautan berawalan www.', () => {
    expect(containsLink('buka www.tokosaya.com sekarang')).toBe(true);
  });

  it('mendeteksi tautan undangan grup & wa.me', () => {
    expect(containsLink('join yuk chat.whatsapp.com/AbCdEf123')).toBe(true);
    expect(containsLink('wa.me/628123456789')).toBe(true);
    expect(containsLink('t.me/grupjualan')).toBe(true);
    expect(containsLink('shopee.co.id/produk')).toBe(true);
  });

  it('tidak menandai harga, nominal, dan teks biasa', () => {
    expect(containsLink('Harga 50.000 ya kak')).toBe(false);
    expect(containsLink('d 50000')).toBe(false);
    expect(containsLink('list')).toBe(false);
    expect(containsLink('assalamualaikum wr wb')).toBe(false);
    expect(containsLink('sisa 2.000 lagi')).toBe(false);
    expect(containsLink('')).toBe(false);
  });
});

describe('containsPhoneNumber', () => {
  it('mendeteksi nomor Indonesia', () => {
    expect(containsPhoneNumber('hubungi 08123456789')).toBe(true);
    expect(containsPhoneNumber('nomor saya +62 812-3456-7890')).toBe(true);
    expect(containsPhoneNumber('62 895 1021 4771')).toBe(true);
    expect(containsPhoneNumber('wa.me/628123456789')).toBe(true);
    expect(containsPhoneNumber('0851.2345.6789')).toBe(true);
  });

  it('tidak menandai nominal dan angka biasa', () => {
    expect(containsPhoneNumber('d 50000')).toBe(false);
    expect(containsPhoneNumber('totalnya 250000')).toBe(false);
    expect(containsPhoneNumber('order 2 pcs')).toBe(false);
    expect(containsPhoneNumber('')).toBe(false);
  });
});
