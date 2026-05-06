export const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';

const date = new Date(dateString);
return new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC'  // 👈 фиксируем UTC
}).format(date);
};

export const formatDateShort = (dateString?: string): string => {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatTime = (dateString?: string): string => {
  if (!dateString) return '—';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getStatusBadge = (status: string): { text: string; color: string } => {
  switch (status) {
    case 'pending':
      return { text: 'Ожидает', color: 'yellow' };
    case 'operator_approved':
      return { text: 'Одобрено оператором', color: 'blue' };
    case 'supervisor_approved':
      return { text: 'Утверждено', color: 'green' };
    case 'rejected':
      return { text: 'Отклонено', color: 'red' };
    case 'active':
      return { text: 'Активен', color: 'green' };
    case 'expired':
      return { text: 'Истек', color: 'gray' };
    default:
      return { text: status, color: 'gray' };
  }
};

export const getListTypeBadge = (listType: string): { text: string; color: string } => {
  switch (listType) {
    case 'white':
      return { text: 'Белый список', color: 'green' };
    case 'black':
      return { text: 'Черный список', color: 'red' };
    case 'vip':
      return { text: 'VIP', color: 'purple' };
    case 'temporary':
      return { text: 'Временный', color: 'yellow' };
    default:
      return { text: listType, color: 'gray' };
  }
};