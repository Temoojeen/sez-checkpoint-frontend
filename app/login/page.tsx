"use client";

import React, { useEffect } from 'react';
import styles from './page.module.css';
import gsap from 'gsap';
import Image from 'next/image';
import img from "../../public/assets/images/test.png"

const LoginPage = () => {
  useEffect(() => {
    // Анимации GSAP
    const ctx = gsap.context(() => {
      // Анимация заголовка
      gsap.from('.login__title', {
        opacity: 0,
        y: -30,
        duration: 1,
        ease: 'power3.out'
      });

      // Анимация полей ввода
      gsap.from('.login__box', {
        opacity: 0,
        x: -50,
        duration: 0.8,
        stagger: 0.2,
        ease: 'back.out(1.2)'
      });

      // Анимация кнопки "Forgot Password"
      gsap.from('.login__forgot', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.6,
        ease: 'power2.out'
      });

      // Анимация кнопки входа
      gsap.from('.login__button', {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        delay: 0.8,
        ease: 'elastic.out(1, 0.5)'
      });

      // Анимация ссылки на регистрацию
      gsap.from('.login__sign', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 1,
        ease: 'power2.out'
      });

      // Анимация изображения
      gsap.from('.login__img', {
        opacity: 0,
        scale: 0.6,
        rotation: 5,
        duration: 1.2,
        delay: 0.3,
        ease: 'power2.out'
      });
    });

    return () => ctx.revert(); // Очистка анимаций при размонтировании
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Здесь будет логика отправки формы
    console.log('Form submitted');
    
    // Анимация при отправке
    gsap.to('.login__button', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
  };

  return (
    <section className={styles.login}>
      <div className={styles.login__content}>
        <div>
          <h2 className={styles.login__title}>Добро пожаловать 👋</h2>

          <form onSubmit={handleSubmit} className={styles.login__form}>
            <div className={styles.login__group}>
              <div className={styles.login__box}>
                <i className={`ri-mail-fill ${styles.login__icon}`}></i>
                <input
                  type="userName"
                  name="userName"
                  autoComplete="userName"
                  required
                  placeholder=" "
                  className={styles.login__input}
                  id="userName"
                />
                <label htmlFor="userName" className={styles.login__label}>
                  Имя пользователя
                </label>
              </div>

              <div className={styles.login__box}>
                <i className={`ri-lock-2-fill ${styles.login__icon}`}></i>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder=" "
                  className={styles.login__input}
                  id="password"
                />
                <label htmlFor="password" className={styles.login__label}>
                  Пароль
                </label>
              </div>
            </div>

            

            <button type="submit" className={styles.login__button}>
              Войти <i className="ri-send-plane-2-fill"></i>
            </button>

            
          </form>
        </div>

        <div className={styles.login__image}>
          <Image
            src={img}
            alt="Login illustration"
            width={480}
            height={480}
            className={styles.login__img}
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default LoginPage;