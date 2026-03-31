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
    default:
      return '/login';
  }
};

export const getRoleName = (roleId: number): string => {
  switch (roleId) {
    case 1:
      return 'Администратор';
    case 2:
      return 'Оператор';
    case 3:
      return 'Руководитель';
    case 4:
      return 'Участник';
    case 5:
      return 'Охрана';
    default:
      return 'Неизвестно';
  }
};

export const getRoleColor = (roleId: number): string => {
  switch (roleId) {
    case 1:
      return 'purple';
    case 2:
      return 'blue';
    case 3:
      return 'orange';
    case 4:
      return 'green';
    case 5:
      return 'red';
    default:
      return 'gray';
  }
};