"use client";

import React, { useEffect, useState, useRef } from 'react';
import styles from './page.module.css';
import gsap from 'gsap';
import Image from 'next/image';
import img from "../../public/assets/images/test.png";
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';


const LoginPage = () => {
  const { login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Анимации GSAP
    const ctx = gsap.context(() => {
      // Анимация контейнера
      gsap.from('.login__container', {
        opacity: 0,
        scale: 0.9,
        duration: 1,
        ease: 'power3.out'
      });

      gsap.from('.login__title', {
        opacity: 0,
        y: -50,
        duration: 1,
        ease: 'power3.out',
        delay: 0.2
      });

      gsap.from('.login__box', {
        opacity: 0,
        x: -30,
        duration: 0.8,
        stagger: 0.2,
        ease: 'back.out(1.2)',
        delay: 0.4
      });

      gsap.from('.login__button', {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        delay: 0.8,
        ease: 'elastic.out(1, 0.5)'
      });

      gsap.from('.login__image', {
        opacity: 0,
        scale: 0.6,
        rotation: 5,
        duration: 1.2,
        delay: 0.3,
        ease: 'power2.out'
      });
    });

    // Запуск видео
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.8; // Замедляем видео для более плавного эффекта
    }

    return () => ctx.revert();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Заполните все поля');
      return;
    }

    setIsSubmitting(true);
    
    // Анимация при отправке
    gsap.to('.login__button', {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });

    try {
      const result = await login(formData.username, formData.password);
      
      if (!result.success) {
        toast.error(result.error || 'Ошибка входа');
        
        // Анимация ошибки
        gsap.to('.login__box', {
          x: -10,
          duration: 0.1,
          repeat: 3,
          yoyo: true,
          ease: 'power1.inOut'
        });
        
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Произошла ошибка при входе');
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.login}>
      {/* Видео фон */}
      <div className={styles.video__wrapper}>
        <video
          ref={videoRef}
          className={styles.video__bg}
          autoPlay
          loop
          muted
          playsInline
          src="/assets/videos/2.mp4"
        />
        <div className={styles.video__overlay}></div>
      </div>

      <div className={styles.login__container}>
        <div className={styles.login__content}>
          <div className={styles.login__form__wrapper}>
            <div className={styles.login__header}>
              <div className={styles.login__badge}>
                <span>
                  <Image
  src="/assets/images/logo.png"
  alt="Logo" // Provide a meaningful alt text for accessibility
  className={styles.logo_img}
  width={100} // Required: specify the image width in pixels
  height={100} // Required: specify the image height in pixels
/>
                </span>
              </div>
              <h2 className={styles.login__title}>
                Добро пожаловать
                <span className={styles.login__title__wave}>👋</span>
              </h2>
              <p className={styles.login__subtitle}>
                Войдите в свой аккаунт
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.login__form}>
              <div className={styles.login__group}>
                <div className={styles.login__box}>
                  <i className={`ri-user-3-line ${styles.login__icon}`}></i>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="username"
                    required
                    placeholder=" "
                    className={styles.login__input}
                    id="username"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="username" className={styles.login__label}>
                    Имя пользователя
                  </label>
                  <div className={styles.input__border}></div>
                </div>

                <div className={styles.login__box}>
                  <i className={`ri-lock-2-line ${styles.login__icon}`}></i>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                    placeholder=" "
                    className={styles.login__input}
                    id="password"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="password" className={styles.login__label}>
                    Пароль
                  </label>
                  <div className={styles.input__border}></div>
                </div>
              </div>

              {/* <div className={styles.login__options}>
                <label className={styles.login__remember}>
                  <input type="checkbox" />
                  <span>Запомнить меня</span>
                </label>
                <a href="/forgot-password" className={styles.login__forgot}>
                  Забыли пароль?
                </a>
              </div> */}

              <button 
                type="submit" 
                className={styles.login__button}
                disabled={isSubmitting || authLoading}
              >
                {isSubmitting ? (
                  <div className={styles.button__loader}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <>
                    <span>Войти</span>
                  </>
                )}
              </button>

              {/* <div className={styles.login__sign}>
                <p>
                  Нет аккаунта?{' '}
                  <a href="/register">
                    Зарегистрироваться
                    <i className="ri-user-add-line"></i>
                  </a>
                </p>
              </div> */}
            </form>
          </div>

          <div className={styles.login__image}>
            <div className={styles.image__wrapper}>
              <Image
                src={img}
                alt="Login illustration"
                width={480}
                height={480}
                className={styles.login__img}
                priority
              />
              <div className={styles.image__glow}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;