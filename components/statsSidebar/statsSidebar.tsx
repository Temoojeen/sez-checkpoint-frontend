import React from 'react'
import styles from './statsSidebar.module.css'

interface Stats {
  today: number
  granted: number
  denied: number
  unknown: number
}

interface Props {
  stats: Stats
}

const StatsSidebar: React.FC<Props> = ({ stats }) => {
  return (
    <div className={styles.statsCard}>
      <h3 className={styles.statsTitle}>
        <i className="ri-bar-chart-2-line"></i>
        Статистика за сегодня
      </h3>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{stats.today}</div>
          <div className={styles.statLabel}>Всего</div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statValueGranted}>
            {stats.granted}
          </div>
          <div className={styles.statLabel}>Разрешено</div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statValueDenied}>
            {stats.denied}
          </div>
          <div className={styles.statLabel}>Нет в списках</div>
        </div>
      </div>
    </div>
  )
}

export default StatsSidebar