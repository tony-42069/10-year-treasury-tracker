'use client'

import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { format } from 'date-fns'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface TreasuryData {
  Date: string
  '10 Yr': string
}

type TimePeriod = '30' | '90' | '180' | '365' | 'MAX'

export default function TreasuryRateTracker() {
  const [historicalRates, setHistoricalRates] = useState<TreasuryData[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTreasuryRates = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const years = ['2024', '2023', '2022', '2021', '2020', '2019']
      const allData: TreasuryData[] = []

      for (const year of years) {
        const response = await fetch(
          `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${year}&term_to_maturity=10year`
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const text = await response.text()
        const rows = text.split('\n')
        const headers = rows[0].split(',')
        const tenYearIndex = headers.findIndex(h => h.includes('10 Yr'))
        
        if (tenYearIndex === -1) {
          throw new Error('Could not find 10-year Treasury rate column in data')
        }

        const yearData = rows.slice(1)
          .filter(row => row.trim())
          .map(row => {
            const columns = row.split(',')
            return {
              Date: columns[0],
              '10 Yr': columns[tenYearIndex].trim()
            }
          })

        allData.push(...yearData)
      }

      allData.sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())
      setHistoricalRates(allData)
    } catch (err) {
      console.error('Error fetching treasury rates:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch treasury rates')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTreasuryRates()
    const intervalId = setInterval(fetchTreasuryRates, 300000) // 5 minutes
    return () => clearInterval(intervalId)
  }, [])

  const getFilteredRates = () => {
    if (selectedPeriod === 'MAX') {
      return historicalRates
    }
    const days = parseInt(selectedPeriod)
    return historicalRates.slice(0, days)
  }

  const filteredRates = getFilteredRates()

  const chartData = {
    labels: filteredRates.map(rate => format(new Date(rate.Date), 'MMM d, yyyy')).reverse(),
    datasets: [
      {
        label: '10-Year Treasury Rate',
        data: filteredRates.map(rate => parseFloat(rate['10 Yr'])).reverse(),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#2563eb',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
      }
    ]
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13
        },
        bodySpacing: 8,
        callbacks: {
          label: (context) => `Rate: ${context.parsed.y.toFixed(2)}%`
        },
        usePointStyle: true,
        boxPadding: 6
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
            weight: '500'
          },
          callback: function(value, index) {
            const period = parseInt(selectedPeriod) || 1000
            const skip = Math.ceil(period / 30)
            return index % skip === 0 ? this.getLabelForValue(value as number) : ''
          },
          color: '#64748b'
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.06)',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          callback: (value) => `${value}%`,
          stepSize: 1,
          font: {
            size: 11,
            weight: '500'
          },
          padding: 8,
          color: '#64748b'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    hover: {
      mode: 'index',
      intersect: false
    }
  }

  if (isLoading) {
    return (
      <div className="loading">
        <div>Loading treasury rates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <div>
          <p>Error loading treasury rates</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const currentRate = historicalRates[0]?.['10 Yr']
  const previousRate = historicalRates[1]?.['10 Yr']
  const rateChange = previousRate 
    ? (parseFloat(currentRate) - parseFloat(previousRate)).toFixed(2)
    : '0.00'
  const isPositiveChange = parseFloat(rateChange) > 0

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="title">10-Year Treasury Rate</div>
          <div className="rate-display">
            <div className="current-rate">{currentRate}%</div>
            <div className={`rate-change ${isPositiveChange ? 'positive' : 'negative'}`}>
              {isPositiveChange ? '↑' : '↓'} {Math.abs(parseFloat(rateChange))}%
            </div>
          </div>
          <div className="last-updated">
            Last Updated: {historicalRates[0]?.Date ? format(new Date(historicalRates[0].Date), 'MMMM d, yyyy') : 'N/A'}
          </div>
        </div>

        <div className="chart-section">
          <div className="chart-header">
            <div className="chart-title">Historical Performance</div>
            <div className="period-selector">
              {(['30', '90', '180', '365', 'MAX'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`period-button ${selectedPeriod === period ? 'active' : ''}`}
                >
                  {period === 'MAX' ? '5Y' : `${period}D`}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-container">
            <Line options={chartOptions} data={chartData} />
          </div>
        </div>

        <div className="footer">
          <div className="footer-text">
            Data sourced directly from the U.S. Department of the Treasury
          </div>
          <div className="footer-meta">
            <span>Updated every 5 minutes</span>
            <span>•</span>
            <span>Real-time data</span>
          </div>
        </div>
      </div>
    </div>
  )
}
