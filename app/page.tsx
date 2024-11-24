import dynamic from 'next/dynamic'

const TreasuryRateTracker = dynamic(
  () => import('../components/TreasuryRateTracker'),
  { ssr: false }
)

export default function Home() {
  return (
    <main>
      <TreasuryRateTracker />
    </main>
  )
}
