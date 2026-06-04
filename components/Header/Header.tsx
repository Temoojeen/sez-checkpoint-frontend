import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Header.module.css';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

interface HeaderProps {
  role: string;
}

const Header: React.FC<HeaderProps> = ({ role }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // 👈 добавляем стейт
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // 👇 Отслеживаем размер экрана безопасно
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    } else {
      router.push('/login');
    }
  };

  const userDisplayName = user?.username || 'Гость';

  const isActiveLink = (path: string) => {
    return pathname === path;
  };

  const showMyNumbersLink = role === "operator" || role === "participant";
  const myNumbersHref = role === "participant" ? "/participant/lists" : "/operator/lists";

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      {/* 👇 Используем isMobile из стейта */}
      {showMyNumbersLink && !isMobile && (
        <Link
          href={myNumbersHref}
          className={`${styles.myNumbersLink} ${isActiveLink(myNumbersHref) ? styles.activeLink : ''}`}
        >
          Мои номера
        </Link>
      )}

      {/* Video Background */}
      <div className={styles.videoBackground}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className={styles.video}
        >
          <source src="/assets/videos/3.mp4" type="video/mp4" />
        </video>
        <div className={styles.overlay}></div>
      </div>

      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText}>
            <Image
              src="/assets/images/logo.png"
              alt="Логотип компании"
              className={styles.logo_img}
              width={100}
              height={100}
              priority
            />
          </Link>
        </div>

        {/* Навигация */}
        <nav className={`${styles.nav} ${isMenuOpen ? styles.active : ''}`}>
          <ul className={styles.navList}>
            {/* 👇 Используем isMobile из стейта */}
            {showMyNumbersLink && isMobile && (
              <li>
                <Link
                  href={myNumbersHref}
                  className={`${styles.navLink} ${isActiveLink(myNumbersHref) ? styles.activeLink : ''}`}
                >
                  Мои номера
                </Link>
              </li>
            )}
          </ul>

          {/* Секция пользователя */}
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{userDisplayName}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              aria-label="Выйти из системы"
            >
              <svg className={styles.logoutIcon} viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Выйти</span>
            </button>
          </div>
        </nav>

        {/* Кнопка мобильного меню */}
        <button
          className={`${styles.menuButton} ${isMenuOpen ? styles.active : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isMenuOpen}
        >
          <span className={styles.menuIcon}></span>
        </button>
      </div>
    </header>
  );
};

export default Header;