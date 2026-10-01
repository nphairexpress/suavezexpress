import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { PageHeader, NavTabs } from "@design-system";
import { Tag, Mail, MessageSquare, Gift } from "lucide-react";
import { PromotionsTab } from "@/components/marketing/PromotionsTab";
import { EmailCampaignsTab } from "@/components/marketing/EmailCampaignsTab";
import { SmsCampaignsTab } from "@/components/marketing/SmsCampaignsTab";
import { LoyaltyTab } from "@/components/marketing/LoyaltyTab";

const TABS = [
  { id: "promocoes", label: "Promoções", icon: Tag },
  { id: "email", label: "Campanhas de E-mail", icon: Mail },
  { id: "sms", label: "Campanhas de SMS", icon: MessageSquare },
  { id: "fidelidade", label: "Fidelidade", icon: Gift },
];

export default function Marketing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "promocoes";

  return (
    <AppLayoutNew>
      <div className="space-y-4 md:space-y-6">
        <PageHeader eyebrow="Relacionamento" title="Marketing">
          <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
            <NavTabs
              tabs={TABS}
              value={activeTab}
              onChange={(v) => setSearchParams({ tab: v })}
              aria-label="Seções do marketing"
            />
          </div>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsContent value="promocoes" className="mt-0">
            <PromotionsTab />
          </TabsContent>
          <TabsContent value="email" className="mt-0">
            <EmailCampaignsTab />
          </TabsContent>
          <TabsContent value="sms" className="mt-0">
            <SmsCampaignsTab />
          </TabsContent>
          <TabsContent value="fidelidade" className="mt-0">
            <LoyaltyTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayoutNew>
  );
}
