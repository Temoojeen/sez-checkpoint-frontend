export const getDashboardPath = (roleId: number): string => {
  switch (roleId) {
    case 1:
      return '/admin';
    case 2:
      return '/operator';
    case 3:
      return '/supervisor';
    case 4:
      return '/participant';
    case 5:
      return '/security';
    case 6:
      return '/smartparking';
    default:
      return '/login';
  }
};

export const getRoleName = (roleId: number): string => {
  switch (roleId) {
    case 1:
      return 'Администратор';
    case 2:
      return 'Оператор КПП 1';
    case 3:
      return 'Руководитель';
    case 4:
      return 'Участник';
    case 5:
      return 'Охрана';
    case 6:
      return 'Оператор SmartParking';
    default:
      return 'Неизвестно';
  }
};

export const getRoleColor = (roleId: number): string => {
  switch (roleId) {
    case 1:
      return '#7c3aed'; // purple
    case 2:
      return '#2563eb'; // blue
    case 3:
      return '#ea580c'; // orange
    case 4:
      return '#059669'; // green
    case 5:
      return '#dc2626'; // red
    case 6:
      return '#0891b2'; // cyan/teal для SmartParking
    default:
      return '#6b7280'; // gray
  }
};

export const getRoleBadgeColor = (roleId: number): { bg: string; text: string } => {
  switch (roleId) {
    case 1:
      return { bg: '#f3e8ff', text: '#7c3aed' };
    case 2:
      return { bg: '#dbeafe', text: '#2563eb' };
    case 3:
      return { bg: '#ffedd5', text: '#ea580c' };
    case 4:
      return { bg: '#d1fae5', text: '#059669' };
    case 5:
      return { bg: '#fee2e2', text: '#dc2626' };
    case 6:
      return { bg: '#cffafe', text: '#0891b2' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

export const getRoleDescription = (roleId: number): string => {
  switch (roleId) {
    case 1:
      return 'Полный доступ ко всем функциям системы';
    case 2:
      return 'Обработка заявок на КПП 1, просмотр назначенных списков';
    case 3:
      return 'Финальное утверждение заявок после оператора';
    case 4:
      return 'Подача заявок на пропуск';
    case 5:
      return 'Просмотр списков пропусков и истории проездов';
    case 6:
      return 'Обработка заявок на SmartParking, интеграция с Parqour';
    default:
      return '';
  }
};

// Проверка, требуется ли организация для роли
export const requiresOrganization = (roleId: number): boolean => {
  return roleId === 4; // Только участник требует организацию
};

// Проверка, требуется ли выбор списков для роли
export const requiresListSelection = (roleId: number): boolean => {
  return roleId === 2 || roleId === 4; // Оператор КПП 1 и участник
};

// Получение всех ролей для селектов
export const getAllRoles = () => {
  return [
    { id: 1, name: 'Администратор' },
    { id: 2, name: 'Оператор КПП 1' },
    { id: 3, name: 'Руководитель' },
    { id: 4, name: 'Участник' },
    { id: 5, name: 'Охрана' },
    { id: 6, name: 'Оператор SmartParking' },
  ];
};