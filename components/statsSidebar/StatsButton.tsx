import React, { useState } from 'react'
import StatsSidebar from './statsSidebar'
import styles from './statsButton.module.css'

interface Stats {
  today: number
  granted: number
  denied: number
  unknown: number
}

interface Props {
  stats: Stats
}

const StatsButton: React.FC<Props> = ({ stats }) => {
  const [showStats, setShowStats] = useState(false)

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={() => setShowStats(true)}
      onMouseLeave={() => setShowStats(false)}
    >
      <button className={styles.button}>
        📊 Статистика
      </button>

      {showStats && (
        <div className={styles.popup}>
          <StatsSidebar stats={stats} />
        </div>
      )}
    </div>
  )
}

export default StatsButton