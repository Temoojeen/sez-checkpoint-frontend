export const getDashboardPath = (roleId: number): string => {
  switch (roleId) {
    case 1: return '/admin';
    case 2: return '/operator';
    case 3: return '/supervisor';
    case 4: return '/participant';
    case 5: return '/security';
    case 6: return '/smartparking';
    case 7: return '/pass-manager'; // <-- добавить
    default: return '/login';
  }
};

export const getRoleName = (roleId: number): string => {
  switch (roleId) {
    case 1: return 'Администратор';
    case 2: return 'Оператор КПП 1';
    case 3: return 'Руководитель';
    case 4: return 'Участник';
    case 5: return 'Охрана';
    case 6: return 'Оператор SmartParking';
    case 7: return 'Менеджер пропусков'; // <-- добавить
    default: return 'Неизвестно';
  }
};

export const getRoleColor = (roleId: number): string => {
  switch (roleId) {
    case 1: return '#7c3aed';
    case 2: return '#2563eb';
    case 3: return '#ea580c';
    case 4: return '#059669';
    case 5: return '#dc2626';
    case 6: return '#0891b2';
    case 7: return '#8b5cf6'; // <-- добавить
    default: return '#6b7280';
  }
};

export const getRoleBadgeColor = (roleId: number): { bg: string; text: string } => {
  switch (roleId) {
    case 1: return { bg: '#f3e8ff', text: '#7c3aed' };
    case 2: return { bg: '#dbeafe', text: '#2563eb' };
    case 3: return { bg: '#ffedd5', text: '#ea580c' };
    case 4: return { bg: '#d1fae5', text: '#059669' };
    case 5: return { bg: '#fee2e2', text: '#dc2626' };
    case 6: return { bg: '#cffafe', text: '#0891b2' };
    case 7: return { bg: '#ede9fe', text: '#8b5cf6' }; // <-- добавить
    default: return { bg: '#f3f4f6', text: '#6b7280' };
  }
};