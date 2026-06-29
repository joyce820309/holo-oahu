import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FlightsPage from './FlightsPage'
import HotelsPage  from './HotelsPage'
import MapPage     from './MapPage'
import CarRentalPage from './CarRentalPage'

export default function TravelPage() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const [tab, setTab] = useState('flights')

  const tabs = [
    { id: 'flights', zh: '機票', en: 'Flights' },
    { id: 'hotels',  zh: '住宿', en: 'Hotels'  },
    { id: 'cars',    zh: '租車', en: 'Cars'    },
    { id: 'map',     zh: '地圖', en: 'Map'      },
  ]

  return (
    <div>
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={tab === t.id
              ? { background: 'var(--accent)', color: 'white' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {lang === 'zh-TW' ? t.zh : t.en}
          </button>
        ))}
      </div>

      {tab === 'flights' && <FlightsPage />}
      {tab === 'hotels'  && <HotelsPage />}
      {tab === 'cars'    && <CarRentalPage />}
      {tab === 'map'     && <MapPage />}
    </div>
  )
}
