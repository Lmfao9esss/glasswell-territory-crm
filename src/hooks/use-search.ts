import { useMemo } from "react";

import type { MapData, SelectedMapEntity } from "@/lib/map/types";

export function useSearch(mapData: MapData | null, searchQuery: string) {
  return useMemo(() => {
    if (!mapData || !searchQuery.trim()) return [];

    const query = searchQuery.trim().toLowerCase();
    const results: SelectedMapEntity[] = [];

    for (const customer of mapData.customers) {
      if (
        [
          customer.name,
          customer.phone,
          customer.email,
          customer.address,
          customer.notes,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      ) {
        results.push({ type: "customer", item: customer });
      }
    }

    for (const lead of mapData.leads) {
      if (
        [
          lead.customer_name,
          lead.phone,
          lead.email,
          lead.address,
          lead.notes,
          lead.requested_service,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      ) {
        results.push({ type: "lead", item: lead });
      }
    }

    for (const street of mapData.streets) {
      if (street.name.toLowerCase().includes(query)) {
        results.push({ type: "street", item: street });
      }
    }

    return results.slice(0, 8);
  }, [mapData, searchQuery]);
}
