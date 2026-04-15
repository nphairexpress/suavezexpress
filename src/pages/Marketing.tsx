import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { PromotionsTab } from "@/components/marketing/PromotionsTab";
import { EmailCampaignsTab } from "@/components/marketing/EmailCampaignsTab";
import { SmsCampaignsTab } from "@/components/marketing/SmsCampaignsTab";
import { LoyaltyTab } from "@/components/marketing/LoyaltyTab";

export default function Marketing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "promocoes";

  return (
    <AppLayoutNew>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Marketing</h1>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="promocoes">Promoções</TabsTrigger>
            <TabsTrigger value="email">Campanhas de E-mail</TabsTrigger>
            <TabsTrigger value="sms">Campanhas de SMS</TabsTrigger>
            <TabsTrigger value="fidelidade">Fidelidade</TabsTrigger>
          </TabsList>

          <TabsContent value="promocoes">
            <PromotionsTab />
          </TabsContent>
          <TabsContent value="email">
            <EmailCampaignsTab />
          </TabsContent>
          <TabsContent value="sms">
            <SmsCampaignsTab />
          </TabsContent>
          <TabsContent value="fidelidade">
            <LoyaltyTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayoutNew>
  );
}
