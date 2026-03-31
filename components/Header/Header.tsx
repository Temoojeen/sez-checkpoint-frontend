import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Header.module.css';
import { useAuth } from '@/hooks/useAuth';
interface HeaderProps {
  role: string;
}
const Header: React.FC<HeaderProps> = ({ role }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

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

  const userDisplayName = user?.username || user?.username || '123';

  const isActiveLink = (path: string) => {
    return pathname === path;
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
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
          {/* Fallback for browsers that don't support video */}
          <div className={styles.fallback}></div>
        </video>
        <div className={styles.overlay}></div>
            {(role === "operator" || role === "participant") && (
              <li>
                <Link
                  href={role === "participant" ? "/participant/lists" : "/operator/lists"}
                  className={`${styles.navLink} ${
                    isActiveLink(role === "participant" ? "/participant/lists" : "/operator/lists")
                      ? styles.activeLink
                      : ""
                  }`}
                >
                  Мои номера
                </Link>
              </li>
            )}
      </div>

      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logo}>
          <Link href="/" className={styles.logoText}>
            <img className={styles.logo_img} src='/assets/images/logo.png' alt="Logo" />
          </Link>
        </div>

        {/* Rest of your header content remains the same */}
        <nav className={`${styles.nav} ${isMenuOpen ? styles.active : ''}`}>
          <ul className={styles.navList}>
          </ul>

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
              aria-label="Logout"
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

        {/* Mobile Menu Button */}
        <button
          className={`${styles.menuButton} ${isMenuOpen ? styles.active : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          >
          <span className={styles.menuIcon}></span>
        </button>
      </div>
    </header>
  );
};

export default Header;