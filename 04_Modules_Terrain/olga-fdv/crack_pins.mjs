import { createHash } from 'crypto';

const SALT = 'OLGA_SALT_2026';
const targetHashes = [
    'c492361f05109de7d168c9954a7c715e93c7228854284082845db8faed6dd409',
    '2f8e46ed72971958a86000294552529d9da3cfa70560ff99bbbc7db4c13468b0'
];

for (let i = 0; i <= 9999; i++) {
    const pin = i.toString().padStart(4, '0');
    const hash = createHash('sha256').update(pin + SALT).digest('hex');
    if (targetHashes.includes(hash)) {
        console.log(`Found PIN for hash ${hash}: ${pin}`);
    }
}
