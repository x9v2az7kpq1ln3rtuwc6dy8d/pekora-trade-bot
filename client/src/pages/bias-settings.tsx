import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Save } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { BiasSetting } from "@shared/schema";

const biasUpdateSchema = z.object({
  high: z.number().min(0.1).max(3.0),
  normal: z.number().min(0.1).max(3.0),
  low: z.number().min(0.1).max(3.0),
  terrible: z.number().min(0.1).max(3.0),
  rising: z.number().min(0.1).max(3.0),
  ok: z.number().min(0.1).max(3.0),
});

type BiasUpdateData = z.infer<typeof biasUpdateSchema>;

export default function BiasSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: biasSettings, isLoading } = useQuery<BiasSetting[]>({
    queryKey: ["/api/bias-settings"],
  });

  const form = useForm<BiasUpdateData>({
    resolver: zodResolver(biasUpdateSchema),
    defaultValues: {
      high: 1.1,
      normal: 1.0,
      low: 0.9,
      terrible: 0.8,
      rising: 1.2,
      ok: 1.0,
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (biasSettings) {
      const formData: BiasUpdateData = {
        high: 1.1,
        normal: 1.0,
        low: 0.9,
        terrible: 0.8,
        rising: 1.2,
        ok: 1.0,
      };

      biasSettings.forEach(setting => {
        if (setting.demandTag in formData) {
          formData[setting.demandTag as keyof BiasUpdateData] = setting.multiplier / 1000;
        }
      });

      form.reset(formData);
    }
  }, [biasSettings, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: BiasUpdateData) => {
      const promises = Object.entries(data).map(([tag, multiplier]) =>
        apiRequest("PUT", `/api/bias-settings/${tag}`, { multiplier })
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bias-settings"] });
      toast({
        title: "Bias Settings Updated",
        description: "All demand bias multipliers have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update bias settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BiasUpdateData) => {
    updateMutation.mutate(data);
  };

  const biasExplanations = {
    high: "Items with high demand are more valuable",
    normal: "Standard multiplier for normal demand items",
    low: "Items with low demand are less valuable",
    terrible: "Items with terrible demand have significantly reduced value",
    rising: "Items with rising demand get a bonus multiplier",
    ok: "Items with ok demand use standard multiplier",
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bias Settings</h1>
              <p className="text-muted-foreground mt-1">Configure demand-based value multipliers for trade evaluation</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Settings className="text-primary text-sm" />
                  </div>
                  <span>Demand Multipliers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {Object.entries(biasExplanations).map(([tag, explanation]) => (
                        <FormField
                          key={tag}
                          control={form.control}
                          name={tag as keyof BiasUpdateData}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="capitalize">{tag} Demand</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  max="3.0"
                                  placeholder="1.0"
                                  data-testid={`input-bias-${tag}`}
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">{explanation}</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                      
                      <div className="flex justify-end pt-4">
                        <Button 
                          type="submit"
                          disabled={updateMutation.isPending}
                          data-testid="button-save-bias-settings"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
                
                <div className="mt-8 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">How Bias Works</h4>
                  <p className="text-sm text-muted-foreground">
                    Bias multipliers are applied to item base values during trade evaluation. 
                    For example, if an item has a base value of 10,000 and "high" demand with a 1.1 multiplier, 
                    its adjusted value becomes 11,000. This helps account for market demand fluctuations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
