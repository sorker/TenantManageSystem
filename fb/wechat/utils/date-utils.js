// 日期工具类
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 计算下一次交租日期
const calculateNextPaymentDate = (lastPaymentDate, frequency) => {
  const nextDate = new Date(lastPaymentDate);
  
  switch (frequency) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'semi_annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1);
  }
  
  return nextDate;
};

// 获取交租周期标签
const getPaymentFrequencyLabel = (frequency) => {
  const labels = {
    'monthly': '月',
    'semi_annual': '半年',
    'quarterly': '季',
    'yearly': '年'
  };
  return labels[frequency] || frequency;
};

// 获取缴费方式标签
const getPaymentMethodLabel = (method) => {
  const labels = {
    'cash': '现金',
    'wechat': '微信',
    'alipay': '支付宝',
    'bank': '银行转账'
  };
  return labels[method] || method;
};

// 获取缴费类型标签
const getPaymentTypeLabel = (type) => {
  const labels = {
    'rent': '租金',
    'water': '水费',
    'electricity': '电费',
    'maintenance': '维修费'
  };
  return labels[type] || type;
};

module.exports = {
  formatDate,
  calculateNextPaymentDate,
  getPaymentFrequencyLabel,
  getPaymentMethodLabel,
  getPaymentTypeLabel
}; 