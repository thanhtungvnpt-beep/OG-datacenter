export interface CronPreset {
  label: string;
  expression: string;
  description: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Mỗi 2 phút', expression: '*/2 * * * *', description: 'Chạy lặp lại mỗi 2 phút' },
  { label: 'Mỗi 5 phút', expression: '*/5 * * * *', description: 'Chạy lặp lại mỗi 5 phút' },
  { label: 'Mỗi 10 phút', expression: '*/10 * * * *', description: 'Chạy lặp lại mỗi 10 phút' },
  { label: 'Mỗi 30 phút', expression: '*/30 * * * *', description: 'Chạy vào phút thứ 0 và phút thứ 30' },
  { label: 'Đầu mỗi giờ', expression: '0 * * * *', description: 'Chạy vào phút 00 của mỗi giờ' },
  { label: '08:00 Sáng Hàng ngày', expression: '0 8 * * *', description: 'Chạy vào 08:00 sáng mỗi ngày' },
  { label: '12:00 Trưa & 18:00 Chiều', expression: '0 12,18 * * *', description: 'Chạy vào 12h trưa và 6h chiều hàng ngày' },
  { label: 'Ngày làm việc (T2 - T6)', expression: '0 9 * * 1-5', description: 'Chạy vào 09:00 sáng từ Thứ Hai đến Thứ Sáu' },
  { label: '00:00 Chủ Nhật', expression: '0 0 * * 0', description: 'Chạy vào nửa đêm mỗi Chủ Nhật hàng tuần' }
];

export function validateCronExpression(expression: string): { valid: boolean; error?: string } {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      valid: false,
      error: `Biểu thức Cron phải có đúng 5 thành phần (phút giờ ngày tháng thứ). Hiện có ${parts.length} thành phần.`
    };
  }

  const [min, hour, dom, mon, dow] = parts;

  // Pattern check for common valid characters: digits, *, /, -, ,
  const validPattern = /^[\d\*\/\,\-]+$/;
  if (![min, hour, dom, mon, dow].every(p => validPattern.test(p))) {
    return {
      valid: false,
      error: 'Biểu thức chứa ký tự không hợp lệ. Chỉ cho phép các số, *, /, -, và dấu phẩy.'
    };
  }

  return { valid: true };
}

export function explainCronExpression(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return 'Biểu thức Cron không hợp lệ (cần 5 trường: phút, giờ, ngày, tháng, thứ)';

  const [min, hour, dom, mon, dow] = parts;

  // Preset quick matches
  const foundPreset = CRON_PRESETS.find(p => p.expression === expression.trim());
  if (foundPreset) return foundPreset.description;

  // Step minutes: */N * * * *
  if (min.startsWith('*/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    const step = min.replace('*/', '');
    return `Chạy lặp lại mỗi ${step} phút một lần`;
  }

  // Hourly at minute N: N * * * *
  if (!min.includes('*') && !min.includes('/') && hour === '*' && dom === '*' && mon === '*' && dow === '*') {
    return `Chạy vào phút thứ ${min} của mỗi giờ`;
  }

  // Daily at HH:MM: M H * * *
  if (!min.includes('*') && !hour.includes('*') && dom === '*' && mon === '*' && dow === '*') {
    const formattedHour = hour.padStart(2, '0');
    const formattedMin = min.padStart(2, '0');
    return `Chạy vào ${formattedHour}:${formattedMin} mỗi ngày`;
  }

  // Weekdays: M H * * 1-5
  if (dow === '1-5') {
    const formattedHour = hour.padStart(2, '0');
    const formattedMin = min.padStart(2, '0');
    return `Chạy vào ${formattedHour}:${formattedMin} các ngày trong tuần (Thứ 2 đến Thứ 6)`;
  }

  return `Chạy theo lịch Cron: Phút [${min}], Giờ [${hour}], Ngày [${dom}], Tháng [${mon}], Thứ [${dow}]`;
}
