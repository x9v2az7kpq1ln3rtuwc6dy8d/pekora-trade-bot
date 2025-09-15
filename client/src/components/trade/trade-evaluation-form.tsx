import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { tradeEvaluationSchema, type TradeEvaluationRequest } from "@shared/schema";
import type { TradeEvaluation } from "@/lib/types";

interface TradeEvaluationFormProps {
  onEvaluationComplete: (evaluation: TradeEvaluation) => void;
}

export function TradeEvaluationForm({ onEvaluationComplete }: TradeEvaluationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TradeEvaluationRequest>({
    resolver: zodResolver(tradeEvaluationSchema),
    defaultValues: {
      yourItems: "",
      theirItems: "",
      proof: "",
    },
  });

  const evaluateMutation = useMutation({
    mutationFn: async (data: TradeEvaluationRequest) => {
      const response = await apiRequest("POST", "/api/evaluate", data);
      return response.json();
    },
    onSuccess: (evaluation: TradeEvaluation) => {
      onEvaluationComplete(evaluation);
      queryClient.invalidateQueries({ queryKey: ["/api/trade-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Trade Evaluated",
        description: "Trade evaluation completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Evaluation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TradeEvaluationRequest) => {
    evaluateMutation.mutate(data);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Calculator className="text-primary text-sm" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Evaluate Trade</h2>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="yourItems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Items</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter items separated by commas&#10;e.g., Dominus Empyreus, Golden Shaggy, Korblox Deathwalker"
                      className="h-32 resize-none"
                      data-testid="textarea-your-items"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Enter item names separated by commas</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="theirItems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Their Items</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter items separated by commas&#10;e.g., Valkyrie Helm, Red Banded Top Hat, Sparkle Time Fedora"
                      className="h-32 resize-none"
                      data-testid="textarea-their-items"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Enter item names separated by commas</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="proof"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proof Link (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://roblox.com/trades/..."
                    data-testid="input-proof"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={evaluateMutation.isPending}
              data-testid="button-evaluate-trade"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {evaluateMutation.isPending ? "Evaluating..." : "Evaluate Trade"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
