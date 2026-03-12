import { PageHeader } from "@/components/common/PageHeader"
import { CompetitionForm } from "@/modules/competition/components/CompetitionForm"
import { getCompetition } from "@/modules/competition/queries"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default async function CompetitionPage() {
  const competition = await getCompetition()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competition Settings"
        description="Manage the WBU 2026 Championship configuration"
      />
      <Card>
        <CardContent className="p-6">
          <CompetitionForm initialData={competition} />
        </CardContent>
      </Card>
    </div>
  )
}
