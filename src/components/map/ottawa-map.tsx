"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Layers3,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Search,
} from "lucide-react";
import L, { type LatLngExpression } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { ActiveStreetPanel } from "@/components/map/active-street-panel";
import { FieldActionBar } from "@/components/map/floating-action-bar";
import { MapEntitySheet } from "@/components/map/map-entity-sheet";
import { MapLegend } from "@/components/map/map-legend";
import {
  CloudModeGuard,
  MapFiltersPanel,
} from "@/components/map/map-panels";
import { QuickLeadSheet } from "@/components/map/quick-lead-sheet";
import { RoutePlanSheet } from "@/components/map/route-plan-sheet";
import { ShiftSummarySheet } from "@/components/map/shift-summary-sheet";
import { MiniMetric, SheetHeader } from "@/components/map/sheet-primitives";
import {
  ShiftHud,
  SmartWarnings,
  StartShiftPanel,
} from "@/components/map/shift-panel";
import { TerritorySetupSheet } from "@/components/map/territory-setup-sheet";
import { useDataSource } from "@/hooks/use-data-source";
import { useSearch } from "@/hooks/use-search";
import { mapConfig } from "@/lib/config";
import {
  leadStatusColors,
  streetStatusColors,
  streetStatusLabels,
  territoryColorByCompletion,
} from "@/lib/map/colors";
import { lineToLatLngs, polygonToLatLngs } from "@/lib/map/geojson";
import {
  calculateTerritoryMetrics,
  findNearestStreet,
  findNearestTerritory,
  firstStreetCoordinate,
  getActiveLock,
  type TerritoryMetrics,
} from "@/lib/map/calculations";
import { addDays, humanize, today } from "@/lib/map/formatters";
import {
  loadLocalSnapshot,
  saveLocalSnapshot,
} from "@/lib/map/local-persistence";
import { createMapDataRepository } from "@/lib/map/repositories";
import {
  planEmployeeRoute,
  routeLineCoordinates,
  type RouteStep,
} from "@/lib/map/route-planning";
import {
  leadStatusLabel,
  quickResultToLeadStatus,
} from "@/lib/map/status-labels";
import {
  createStreetRows,
  createTerritoryRow,
  type ImportedStreetPreview,
  type TerritorySetupDraft,
} from "@/lib/map/territory-setup";
import type {
  ActivityLogItem,
  ActivityLogRow,
  AuthProfileState,
  CustomerRow,
  FollowUpDraft,
  FollowUpRow,
  JobDraft,
  JobRow,
  LeadDraft,
  LeadRow,
  LeadStatus,
  MapData,
  MapFilters,
  ProfileRow,
  QuickLeadDraft,
  QuickResult,
  SelectedMapEntity,
  ShiftSession,
  StreetLockState,
  StreetRow,
  StreetStatus,
  TimelineItem,
  TerritoryRow,
  TerritoryStatus,
} from "@/lib/map/types";
import { captureError } from "@/lib/observability/error-logger";
import {
  measureSync,
  recordTiming,
} from "@/lib/observability/performance-monitor";

const allFilters: MapFilters = {
  territoryId: "all",
  streetStatus: "all",
  leadStatus: "all",
  employeeId: "all",
};

const leadFilterStatuses: Array<LeadStatus | "all"> = [
  "all",
  "interested",
  "quoted",
  "waiting",
  "booked",
  "repeat_customer",
  "no_answer",
  "lost",
  "do_not_contact",
];

function createLeadIcon(color: string) {
  return L.divIcon({
    className: "glasswell-lead-pin",
    html: `<span style="background:${color}" aria-hidden="true"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function LocationController({ target }: { target: LatLngExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo(target, 16, { duration: 0.75 });
    }
  }, [map, target]);

  return null;
}

function MapClickController({
  onMapTap,
}: {
  onMapTap: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapTap(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapRenderTimingController() {
  const map = useMap();

  useEffect(() => {
    const startedAt = performance.now();

    window.requestAnimationFrame(() => {
      recordTiming("map.render", startedAt, {
        zoom: map.getZoom(),
      });
    });
  }, [map]);

  return null;
}

export function OttawaMap({ auth }: { auth: AuthProfileState }) {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MapFilters>(allFilters);
  const [selectedEntity, setSelectedEntity] =
    useState<SelectedMapEntity | null>(null);
  const [territoryListOpen, setTerritoryListOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngExpression | null>(
    null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [streetLocks, setStreetLocks] = useState<StreetLockState[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [leadDraft, setLeadDraft] = useState<LeadDraft | null>(null);
  const [jobDraft, setJobDraft] = useState<JobDraft | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [shift, setShift] = useState<ShiftSession | null>(null);
  const [shiftSummaryOpen, setShiftSummaryOpen] = useState(false);
  const [activeStreetId, setActiveStreetId] = useState<string | null>(null);
  const [streetStartedAt, setStreetStartedAt] = useState<string | null>(null);
  const [quickLeadDraft, setQuickLeadDraft] = useState<QuickLeadDraft | null>(
    null,
  );
  const [territorySetupOpen, setTerritorySetupOpen] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { dataMode } = useDataSource(auth);

  useEffect(() => {
    let active = true;

    if (
      dataMode === "cloud" &&
      (!auth.isConfigured || !auth.userId || !auth.profile?.active)
    ) {
      const timeoutId = window.setTimeout(() => {
        setMapData(null);
        setIsLoading(false);
        setError(null);
      }, 0);
      return () => {
        active = false;
        window.clearTimeout(timeoutId);
      };
    }

    const repository = createMapDataRepository(dataMode);

    async function loadMapData() {
      try {
        setIsLoading(true);
        const nextData = await repository.loadMapData();
        const localSnapshot =
          dataMode === "demo"
            ? loadLocalSnapshot()
            : { ok: true as const, snapshot: null, migrated: false };
        const loadedSnapshot =
          localSnapshot.ok && localSnapshot.snapshot
            ? localSnapshot.snapshot
            : null;
        const cloudLocks =
          dataMode === "cloud"
            ? (await repository.listStreetLocks()).map(mapStreetLockRow)
            : null;
        const cloudActivities =
          dataMode === "cloud"
            ? (await repository.listActivityLog()).map(mapActivityLogRow)
            : null;

        if (active) {
          setMapData(loadedSnapshot?.mapData ?? nextData);
          setStreetLocks(
            loadedSnapshot?.streetLocks ??
              cloudLocks ??
              createInitialLocks(nextData),
          );
          setActivities(
            loadedSnapshot?.activities ??
              cloudActivities ??
              createInitialActivities(nextData),
          );
          setTimelineItems(
            loadedSnapshot?.timelineItems ?? createInitialTimeline(nextData),
          );
          setShift(loadedSnapshot?.shift ?? null);
          setActiveStreetId(loadedSnapshot?.activeStreetId ?? null);
          setStreetStartedAt(loadedSnapshot?.streetStartedAt ?? null);
          setError(null);
          if (!localSnapshot.ok) {
            setToast(localSnapshot.error);
          } else if (localSnapshot.migrated) {
            setToast("Saved demo data used an older schema and was reset.");
          } else if (loadedSnapshot) {
            setToast("Local demo data restored.");
          } else if (dataMode === "cloud") {
            setToast("Cloud data loaded.");
          }
        }
      } catch (loadError) {
        captureError(loadError, "Map data failed to load.", {
          area: "map",
          operation: "loadMapData",
          metadata: { dataMode },
        });
        if (active) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Map data could not be loaded.";
          setError(message);
          setToast(
            dataMode === "cloud"
              ? `Connection issue. Your changes may not sync. ${message}`
              : message,
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadMapData();

    return () => {
      active = false;
    };
  }, [auth.isConfigured, auth.profile?.active, auth.userId, dataMode]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (dataMode !== "demo" || isLoading || !mapData) return;

    saveLocalSnapshot({
      mapData,
      streetLocks,
      activities,
      timelineItems,
      shift,
      activeStreetId,
      streetStartedAt,
    });
  }, [
    activeStreetId,
    activities,
    dataMode,
    isLoading,
    mapData,
    shift,
    streetLocks,
    streetStartedAt,
    timelineItems,
  ]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!mapData) return;

    const raw = window.sessionStorage.getItem("glasswell.openEntity");
    if (!raw) return;

    try {
      const target = JSON.parse(raw) as {
        type: "lead" | "customer" | "street" | "territory";
        id: string;
      };
      const entity =
        target.type === "lead"
          ? mapData.leads.find((item) => item.id === target.id)
          : target.type === "customer"
            ? mapData.customers.find((item) => item.id === target.id)
            : target.type === "street"
              ? mapData.streets.find((item) => item.id === target.id)
              : mapData.territories.find((item) => item.id === target.id);

      if (entity) {
        setSelectedEntity({ type: target.type, item: entity } as SelectedMapEntity);
        setToast("Opened from dashboard.");
      }
    } finally {
      window.sessionStorage.removeItem("glasswell.openEntity");
    }
  }, [mapData]);

  const currentUser =
    dataMode === "cloud" && auth.profile
      ? auth.profile
      : mapData?.employees.find((employee) => employee.role === "employee");
  const managerUser = mapData?.employees.find(
    (employee) => employee.role === "manager",
  );

  const employeeById = useMemo(() => {
    return new Map(
      mapData?.employees.map((employee) => [employee.id, employee]) ?? [],
    );
  }, [mapData]);

  const territoryMetrics = useMemo(() => {
    if (!mapData) return new Map<string, TerritoryMetrics>();

    return new Map(
      mapData.territories.map((territory) => [
        territory.id,
        calculateTerritoryMetrics(territory, mapData.streets, mapData.leads),
      ]),
    );
  }, [mapData]);

  const assignedTerritory = useMemo(() => {
    if (!mapData || !currentUser) return mapData?.territories[0] ?? null;

    return (
      mapData.territories.find(
        (territory) => territory.assigned_employee_id === currentUser.id,
      ) ??
      mapData.territories[0] ??
      null
    );
  }, [currentUser, mapData]);

  const activeStreet = useMemo(() => {
    if (!mapData || !activeStreetId) return null;

    return (
      mapData.streets.find((street) => street.id === activeStreetId) ?? null
    );
  }, [activeStreetId, mapData]);

  const activeStreetLock = activeStreet
    ? (getActiveLock(activeStreet.id, streetLocks) ?? null)
    : null;
  const canManageTerritories =
    dataMode === "demo" ||
    auth.profile?.role === "owner" ||
    auth.profile?.role === "manager";
  const routeLocation = useMemo(() => {
    if (Array.isArray(userLocation)) {
      return {
        latitude: Number(userLocation[0]),
        longitude: Number(userLocation[1]),
      };
    }

    return shift?.startLocation ?? null;
  }, [shift?.startLocation, userLocation]);
  const routePlan = useMemo(() => {
    if (!routeActive || !mapData) return null;

    return measureSync(
      "route.calculation",
      {
        streetCount: mapData.streets.length,
        leadCount: mapData.leads.length,
        hasLocation: Boolean(routeLocation),
      },
      () =>
        planEmployeeRoute({
          territory: assignedTerritory,
          employee: currentUser ?? null,
          streets: mapData.streets,
          leads: mapData.leads,
          customers: mapData.customers,
          jobs: mapData.jobs,
          followUps: mapData.followUps,
          locks: streetLocks,
          currentLocation: routeLocation,
        }),
    );
  }, [
    assignedTerritory,
    currentUser,
    mapData,
    routeActive,
    routeLocation,
    streetLocks,
  ]);
  const routeOverlayPositions = useMemo(
    () => routeLineCoordinates(routePlan),
    [routePlan],
  );

  const selectedEntityResolved = useMemo(() => {
    if (!selectedEntity || !mapData) return selectedEntity;

    if (selectedEntity.type === "territory") {
      const item =
        mapData.territories.find(
          (territory) => territory.id === selectedEntity.item.id,
        ) ?? selectedEntity.item;
      return { type: "territory" as const, item };
    }

    if (selectedEntity.type === "street") {
      const item =
        mapData.streets.find((street) => street.id === selectedEntity.item.id) ??
        selectedEntity.item;
      return { type: "street" as const, item };
    }

    if (selectedEntity.type === "lead") {
      const item =
        mapData.leads.find((lead) => lead.id === selectedEntity.item.id) ??
        selectedEntity.item;
      return { type: "lead" as const, item };
    }

    const item =
      mapData.customers.find(
        (customer) => customer.id === selectedEntity.item.id,
      ) ?? selectedEntity.item;
    return { type: "customer" as const, item };
  }, [mapData, selectedEntity]);

  const searchResults = useSearch(mapData, searchQuery);

  const visibleTerritories = useMemo(() => {
    if (!mapData) return [];

    return mapData.territories.filter((territory) => {
      if (
        filters.territoryId !== "all" &&
        territory.id !== filters.territoryId
      ) {
        return false;
      }

      if (
        filters.employeeId !== "all" &&
        territory.assigned_employee_id !== filters.employeeId
      ) {
        return false;
      }

      return true;
    });
  }, [filters.employeeId, filters.territoryId, mapData]);

  const visibleTerritoryIds = useMemo(
    () => new Set(visibleTerritories.map((territory) => territory.id)),
    [visibleTerritories],
  );

  const visibleStreets = useMemo(() => {
    if (!mapData) return [];

    return mapData.streets.filter((street) => {
      if (!visibleTerritoryIds.has(street.territory_id)) return false;
      if (
        filters.streetStatus !== "all" &&
        street.status !== filters.streetStatus
      ) {
        return false;
      }
      if (
        filters.employeeId !== "all" &&
        street.assigned_employee_id !== filters.employeeId
      ) {
        return false;
      }

      return true;
    });
  }, [filters.employeeId, filters.streetStatus, mapData, visibleTerritoryIds]);

  const visibleStreetIds = useMemo(
    () => new Set(visibleStreets.map((street) => street.id)),
    [visibleStreets],
  );

  const visibleLeads = useMemo(() => {
    if (!mapData) return [];

    return mapData.leads.filter((lead) => {
      if (lead.street_id && !visibleStreetIds.has(lead.street_id)) return false;
      if (filters.leadStatus !== "all" && lead.status !== filters.leadStatus) {
        return false;
      }
      if (
        filters.employeeId !== "all" &&
        lead.assigned_employee_id !== filters.employeeId
      ) {
        return false;
      }

      return lead.latitude !== null && lead.longitude !== null;
    });
  }, [filters.employeeId, filters.leadStatus, mapData, visibleStreetIds]);

  function appendActivity(
    activity: Omit<ActivityLogItem, "id" | "actorId" | "createdAt">,
  ) {
    setActivities((current) => [
      {
        ...activity,
        id: crypto.randomUUID(),
        actorId: currentUser?.id ?? managerUser?.id ?? "system",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  function appendTimeline(item: Omit<TimelineItem, "id" | "createdAt">) {
    setTimelineItems((current) => [
      {
        ...item,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }

  function startShift() {
    if (!currentUser) return;

    const createShift = (
      startLocation: ShiftSession["startLocation"],
      locationMessage?: string,
    ) => {
      const startedAt = new Date().toISOString();
      setShift({
        employeeId: currentUser.id,
        territoryId: assignedTerritory?.id ?? null,
        startedAt,
        endedAt: null,
        startLocation,
        housesKnocked: 0,
        leads: 0,
        quotes: 0,
        jobsBooked: 0,
        streetsCompleted: 0,
        estimatedRevenue: 0,
        notes: "",
      });
      if (locationMessage) {
        setLocationError(locationMessage);
      }
      appendActivity({
        territoryId: assignedTerritory?.id ?? mapData?.territories[0]?.id ?? "",
        action: "street_started",
        message: `${currentUser.full_name} started a field shift`,
      });
    };

    setLocationError(null);

    if (!navigator.geolocation) {
      createShift(null, "Shift started without browser location support.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const startLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation([startLocation.latitude, startLocation.longitude]);
        createShift(startLocation);
      },
      () => {
        createShift(null, "Shift started. Location permission was not available.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }

  function endShift() {
    setShift((current) =>
      current
        ? {
            ...current,
            endedAt: new Date().toISOString(),
          }
        : current,
    );
    setActiveStreetId(null);
    setStreetStartedAt(null);
    setShiftSummaryOpen(true);
  }

  function incrementHouse(delta: number) {
    if (!activeStreet || !currentUser) return;

    const nextCount = Math.max(
      0,
      Math.min(activeStreet.estimated_houses, activeStreet.houses_knocked + delta),
    );
    const appliedDelta = nextCount - activeStreet.houses_knocked;

    if (appliedDelta === 0) return;

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        streets: current.streets.map((street) =>
          street.id === activeStreet.id
            ? {
                ...street,
                houses_knocked: nextCount,
                completion_percent: Math.round(
                  (nextCount / Math.max(1, street.estimated_houses)) * 100,
                ),
                last_knock_date: today(),
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
              }
            : street,
        ),
      };
    });
    setShift((current) =>
      current
        ? {
            ...current,
            housesKnocked: Math.max(0, current.housesKnocked + appliedDelta),
          }
        : current,
    );
  }

  function recordQuickResult(result: QuickResult) {
    if (!activeStreet || !currentUser) return;

    incrementHouse(1);

    if (result === "no_answer" || result === "do_not_contact") {
      appendActivity({
        territoryId: activeStreet.territory_id,
        streetId: activeStreet.id,
        action: "lead_created",
        message:
          result === "no_answer"
            ? `No answer recorded on ${activeStreet.name}`
            : `Do not contact recorded on ${activeStreet.name}`,
      });
      return;
    }

    setShift((current) =>
      current
        ? {
            ...current,
            leads: current.leads + 1,
            quotes:
              result === "quoted" || result === "booked"
                ? current.quotes + 1
                : current.quotes,
            jobsBooked:
              result === "booked" ? current.jobsBooked + 1 : current.jobsBooked,
            estimatedRevenue:
              result === "booked"
                ? current.estimatedRevenue + 250
                : current.estimatedRevenue,
          }
        : current,
    );
    setQuickLeadDraft({
      streetId: activeStreet.id,
      result,
      phone: "",
      name: "",
      quote: result === "booked" ? "250" : "",
      notes: "",
    });
  }

  function saveQuickLead() {
    if (!mapData || !quickLeadDraft || !currentUser) return;
    if (!quickLeadDraft.phone.trim() && !quickLeadDraft.name.trim()) {
      setToast("Add a phone number or name before saving a lead.");
      return;
    }
    if (quickLeadDraft.quote && Number(quickLeadDraft.quote) < 0) {
      setToast("Quote amount cannot be negative.");
      return;
    }
    const street = mapData.streets.find(
      (item) => item.id === quickLeadDraft.streetId,
    );
    if (!street) return;

    const territory = mapData.territories.find(
      (item) => item.id === street.territory_id,
    );
    const leadStatus = quickResultToLeadStatus(quickLeadDraft.result);
    const coordinates = firstStreetCoordinate(street);
    const lead: LeadRow = {
      id: crypto.randomUUID(),
      organization_id: mapData.organization.id,
      territory_id: territory?.id ?? null,
      street_id: street.id,
      customer_id: null,
      assigned_employee_id: currentUser.id,
      customer_name: quickLeadDraft.name || "Quick lead",
      phone: quickLeadDraft.phone || null,
      email: null,
      address: `${street.name}, Ottawa`,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      quote_amount: quickLeadDraft.quote ? Number(quickLeadDraft.quote) : null,
      requested_service: null,
      notes: quickLeadDraft.notes || null,
      follow_up_date:
        quickLeadDraft.result === "call_back" ? addDays(1) : null,
      lead_source: "door_to_door",
      status: leadStatus,
      job_status:
        leadStatus === "booked"
          ? "booked"
          : leadStatus === "quoted"
            ? "quoted"
            : "draft",
      before_photo_urls: [],
      after_photo_urls: [],
      internal_comments: "Created from quick field mode.",
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMapData((current) =>
      current ? { ...current, leads: [...current.leads, lead] } : current,
    );
    appendActivity({
      territoryId: lead.territory_id ?? mapData.territories[0]?.id ?? "",
      streetId: street.id,
      action: "lead_created",
      message: `${lead.customer_name} saved from quick mode`,
    });
    appendTimeline({
      leadId: lead.id,
      label: "Lead Created",
      description: `${lead.customer_name} added during field shift.`,
    });
    setQuickLeadDraft(null);
    setSelectedEntity({ type: "lead", item: lead });
    setToast("Lead saved.");
  }

  function saveLead() {
    if (!mapData || !leadDraft || !currentUser) return;
    const seriousLead = !["no_answer", "lost", "do_not_contact"].includes(
      leadDraft.status,
    );
    if (
      seriousLead &&
      !leadDraft.phone.trim() &&
      !leadDraft.customerName.trim()
    ) {
      setToast("Add a phone number or name before saving a lead.");
      return;
    }
    if (leadDraft.quoteAmount && Number(leadDraft.quoteAmount) < 0) {
      setToast("Quote amount cannot be negative.");
      return;
    }

    const territory = findNearestTerritory(mapData.territories, leadDraft.latitude);
    const street = findNearestStreet(mapData.streets, territory?.id);
    const newLead: LeadRow = {
      id: crypto.randomUUID(),
      organization_id: mapData.organization.id,
      territory_id: territory?.id ?? null,
      street_id: street?.id ?? null,
      customer_id: null,
      assigned_employee_id: currentUser.id,
      customer_name: leadDraft.customerName || "New lead",
      phone: leadDraft.phone || null,
      email: leadDraft.email || null,
      address: leadDraft.address,
      latitude: leadDraft.latitude,
      longitude: leadDraft.longitude,
      quote_amount: leadDraft.quoteAmount ? Number(leadDraft.quoteAmount) : null,
      requested_service: null,
      notes: leadDraft.notes || null,
      follow_up_date: null,
      lead_source: "door_to_door",
      status: leadDraft.status,
      job_status: leadDraft.status === "quoted" ? "quoted" : "draft",
      before_photo_urls: [],
      after_photo_urls: [],
      internal_comments: null,
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMapData((current) =>
      current ? { ...current, leads: [...current.leads, newLead] } : current,
    );
    appendActivity({
      territoryId: newLead.territory_id ?? mapData.territories[0]?.id ?? "",
      streetId: newLead.street_id ?? undefined,
      action: "lead_created",
      message: `Lead created for ${newLead.customer_name}`,
    });
    appendTimeline({
      leadId: newLead.id,
      label: "Lead Created",
      description: `${newLead.customer_name} added from the map.`,
    });
    setLeadDraft(null);
    setSelectedEntity({ type: "lead", item: newLead });
    setToast("Lead created.");
  }

  function convertLeadToCustomer(lead: LeadRow) {
    if (!mapData || !currentUser) return;
    const existing = lead.customer_id
      ? mapData.customers.find((customer) => customer.id === lead.customer_id)
      : null;

    if (existing) {
      setSelectedEntity({ type: "customer", item: existing });
      return;
    }

    const customer: CustomerRow = {
      id: crypto.randomUUID(),
      organization_id: lead.organization_id,
      territory_id: lead.territory_id,
      street_id: lead.street_id,
      name: lead.customer_name || "New customer",
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      latitude: lead.latitude,
      longitude: lead.longitude,
      preferred_service_type: "residential",
      preferred_interval_days: 180,
      do_not_contact: lead.status === "do_not_contact",
      notes: lead.notes,
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        customers: [...current.customers, customer],
        leads: current.leads.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                customer_id: customer.id,
                status: "repeat_customer",
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      };
    });
    appendActivity({
      territoryId: lead.territory_id ?? mapData.territories[0]?.id ?? "",
      streetId: lead.street_id ?? undefined,
      action: "lead_converted",
      message: `${lead.customer_name} converted to customer`,
    });
    appendTimeline({
      customerId: customer.id,
      leadId: lead.id,
      label: "Lead Converted",
      description: `${lead.customer_name} became a customer.`,
    });
    setSelectedEntity({ type: "customer", item: customer });
  }

  function openJobDraft(subjectType: "lead" | "customer", subjectId: string) {
    const employeeId = currentUser?.id ?? mapData?.employees[0]?.id ?? "";
    setJobDraft({
      subjectType,
      subjectId,
      date: today(),
      time: "09:00",
      service: "residential",
      price: "",
      assignedEmployeeId: employeeId,
      notes: "",
    });
  }

  function saveJob() {
    if (!mapData || !jobDraft || !currentUser) return;
    if (!jobDraft.date || !jobDraft.time || !jobDraft.price) {
      setToast("A booked job needs a date, time, and price.");
      return;
    }
    if (Number(jobDraft.price) <= 0) {
      setToast("Job price must be greater than zero.");
      return;
    }
    const lead =
      jobDraft.subjectType === "lead"
        ? mapData.leads.find((item) => item.id === jobDraft.subjectId)
        : null;
    const customer =
      jobDraft.subjectType === "customer"
        ? mapData.customers.find((item) => item.id === jobDraft.subjectId)
        : lead?.customer_id
          ? mapData.customers.find((item) => item.id === lead.customer_id)
          : null;
    const scheduledAt = new Date(`${jobDraft.date}T${jobDraft.time}:00`).toISOString();
    const job: JobRow = {
      id: crypto.randomUUID(),
      organization_id: mapData.organization.id,
      customer_id: customer?.id ?? null,
      lead_id: lead?.id ?? null,
      territory_id: customer?.territory_id ?? lead?.territory_id ?? null,
      street_id: customer?.street_id ?? lead?.street_id ?? null,
      assigned_employee_id: jobDraft.assignedEmployeeId,
      service_type: jobDraft.service,
      status: "booked",
      quote_amount: jobDraft.price ? Number(jobDraft.price) : null,
      revenue: jobDraft.price ? Number(jobDraft.price) : 0,
      scheduled_at: scheduledAt,
      completed_at: null,
      recurrence_interval_days: jobDraft.service === "commercial" ? 30 : 180,
      next_service_due_at: null,
      notes: jobDraft.notes || null,
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        jobs: [...current.jobs, job],
        leads: lead
          ? current.leads.map((item) =>
              item.id === lead.id
                ? { ...item, status: "booked", job_status: "booked" }
                : item,
            )
          : current.leads,
      };
    });
    appendActivity({
      territoryId: job.territory_id ?? mapData.territories[0]?.id ?? "",
      streetId: job.street_id ?? undefined,
      action: "job_booked",
      message: `Job booked for ${customer?.name ?? lead?.customer_name ?? "customer"}`,
    });
    appendTimeline({
      customerId: customer?.id,
      leadId: lead?.id,
      jobId: job.id,
      label: "Booked Job",
      description: `${humanize(job.service_type)} job booked for ${jobDraft.date}.`,
    });
    setJobDraft(null);
    setToast("Job booked.");
  }

  function openFollowUpDraft(
    subjectType: "lead" | "customer",
    subjectId: string,
    label: string,
    days: number,
  ) {
    setFollowUpDraft({
      subjectType,
      subjectId,
      label,
      dueAt: addDays(days),
    });
  }

  function saveFollowUp() {
    if (!mapData || !followUpDraft || !currentUser) return;
    if (!followUpDraft.dueAt) {
      setToast("Choose a follow-up date.");
      return;
    }
    const lead =
      followUpDraft.subjectType === "lead"
        ? mapData.leads.find((item) => item.id === followUpDraft.subjectId)
        : null;
    const customer =
      followUpDraft.subjectType === "customer"
        ? mapData.customers.find((item) => item.id === followUpDraft.subjectId)
        : null;
    const followUp: FollowUpRow = {
      id: crypto.randomUUID(),
      organization_id: mapData.organization.id,
      lead_id: lead?.id ?? null,
      customer_id: customer?.id ?? null,
      job_id: null,
      assigned_employee_id: currentUser.id,
      due_at: `${followUpDraft.dueAt}T13:00:00.000Z`,
      status: "open",
      reason: followUpDraft.label,
      completed_at: null,
      notes: `${followUpDraft.label} follow-up`,
      created_by: currentUser.id,
      updated_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMapData((current) =>
      current
        ? { ...current, followUps: [...current.followUps, followUp] }
        : current,
    );
    appendActivity({
      territoryId:
        lead?.territory_id ??
        customer?.territory_id ??
        mapData.territories[0]?.id ??
        "",
      streetId: lead?.street_id ?? customer?.street_id ?? undefined,
      action: "follow_up_created",
      message: `${followUpDraft.label} follow-up scheduled`,
    });
    appendTimeline({
      customerId: customer?.id,
      leadId: lead?.id,
      followUpId: followUp.id,
      label: "Follow-up",
      description: `${followUpDraft.label} follow-up due ${followUpDraft.dueAt}.`,
    });
    setFollowUpDraft(null);
    setToast("Follow-up scheduled.");
  }

  function markLeadLost(lead: LeadRow) {
    if (!mapData || !currentUser) return;

    setMapData((current) =>
      current
        ? {
            ...current,
            leads: current.leads.map((item) =>
              item.id === lead.id
                ? {
                    ...item,
                    status: "lost",
                    job_status: "lost",
                    updated_by: currentUser.id,
                    updated_at: new Date().toISOString(),
                  }
                : item,
            ),
          }
        : current,
    );
    appendActivity({
      territoryId: lead.territory_id ?? mapData.territories[0]?.id ?? "",
      streetId: lead.street_id ?? undefined,
      action: "lead_lost",
      message: `${lead.customer_name} marked lost`,
    });
  }

  function attachMockPhoto(
    type: "before" | "after",
    subjectType: "lead" | "customer",
    subjectId: string,
  ) {
    if (!mapData || !currentUser) return;
    const placeholder = `mock-${type}-photo-${Date.now()}.jpg`;

    if (subjectType === "lead") {
      setMapData((current) =>
        current
          ? {
              ...current,
              leads: current.leads.map((lead) =>
                lead.id === subjectId
                  ? {
                      ...lead,
                      before_photo_urls:
                        type === "before"
                          ? [...lead.before_photo_urls, placeholder]
                          : lead.before_photo_urls,
                      after_photo_urls:
                        type === "after"
                          ? [...lead.after_photo_urls, placeholder]
                          : lead.after_photo_urls,
                    }
                  : lead,
              ),
            }
          : current,
      );
    }

    appendTimeline({
      [subjectType === "lead" ? "leadId" : "customerId"]: subjectId,
      label: "Photo Attached",
      description: `${humanize(type)} photo added locally.`,
    });
  }

  function updateStreetStatus(street: StreetRow, status: StreetStatus) {
    if (!mapData || !currentUser) return;
    if (status === "completed" && !shift) {
      setToast("Start a shift before completing a street.");
      return;
    }
    if (
      status === "do_not_knock" &&
      !window.confirm(`Mark ${street.name} as do not knock?`)
    ) {
      return;
    }

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        streets: current.streets.map((item) =>
          item.id === street.id
            ? {
                ...item,
                status,
                completion_percent: status === "completed" ? 100 : item.completion_percent,
                houses_knocked:
                  status === "completed" ? item.estimated_houses : item.houses_knocked,
                last_knock_date:
                  status === "active" || status === "completed"
                    ? today()
                    : item.last_knock_date,
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      };
    });

    if (status === "active") {
      setActiveStreetId(street.id);
      setStreetStartedAt(new Date().toISOString());
      setStreetLocks((locks) => [
        ...locks.filter(
          (lock) => lock.streetId !== street.id || lock.releasedAt !== null,
        ),
        {
          id: crypto.randomUUID(),
          streetId: street.id,
          employeeId: currentUser.id,
          lockedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          releasedAt: null,
          releasedBy: null,
          overrideReason: null,
        },
      ]);
      appendActivity({
        territoryId: street.territory_id,
        streetId: street.id,
        action: "street_started",
        message: `${street.name} started by ${currentUser.full_name}`,
      });
      setToast(`${street.name} started.`);
      return;
    }

    if (["completed", "skipped", "do_not_knock"].includes(status)) {
      releaseStreetLock(street.id, currentUser.id);
      if (activeStreetId === street.id) {
        setActiveStreetId(null);
        setStreetStartedAt(null);
      }
      if (status === "completed") {
        setShift((current) =>
          current
            ? {
                ...current,
                streetsCompleted: current.streetsCompleted + 1,
              }
            : current,
        );
        if (routeActive) {
          setSelectedEntity(null);
          setRouteSheetOpen(true);
        } else {
          const nextStreet = mapData.streets.find(
            (item) =>
              item.territory_id === street.territory_id &&
              item.id !== street.id &&
              item.status === "not_knocked",
          );
          if (nextStreet) {
            setSelectedEntity({ type: "street", item: nextStreet });
          }
        }
      } else if (routeActive && status === "skipped") {
        setSelectedEntity(null);
        setRouteSheetOpen(true);
      }
    }

    appendActivity({
      territoryId: street.territory_id,
      streetId: street.id,
      action:
        status === "completed"
          ? "street_completed"
          : status === "skipped"
            ? "street_skipped"
            : "street_do_not_knock",
      message: `${street.name} marked ${streetStatusLabels[status]}`,
    });
    if (status === "completed") {
      setToast(`${street.name} completed.`);
    } else if (status === "skipped") {
      setToast(`${street.name} skipped.`);
    } else if (status === "do_not_knock") {
      setToast(`${street.name} marked do not knock.`);
    }
  }

  function releaseStreetLock(streetId: string, releasedBy: string) {
    setStreetLocks((locks) =>
      locks.map((lock) =>
        lock.streetId === streetId && lock.releasedAt === null
          ? {
              ...lock,
              releasedAt: new Date().toISOString(),
              releasedBy,
            }
          : lock,
      ),
    );
  }

  function overrideStreetLock(street: StreetRow) {
    if (!managerUser) return;
    if (!window.confirm(`Override the active lock on ${street.name}?`)) {
      return;
    }

    setStreetLocks((locks) =>
      locks.map((lock) =>
        lock.streetId === street.id && lock.releasedAt === null
          ? {
              ...lock,
              releasedAt: new Date().toISOString(),
              releasedBy: managerUser.id,
              overrideReason: "Manager override from Phase 4 mock UI",
            }
          : lock,
      ),
    );
    appendActivity({
      territoryId: street.territory_id,
      streetId: street.id,
      action: "lock_overridden",
      message: `${street.name} lock overridden by ${managerUser.full_name}`,
    });
  }

  function addStreetNote(street: StreetRow) {
    if (!mapData || !currentUser) return;

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        streets: current.streets.map((item) =>
          item.id === street.id
            ? {
                ...item,
                notes: `${item.notes ? `${item.notes} ` : ""}Note added ${today()}.`,
                updated_by: currentUser.id,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      };
    });
    appendActivity({
      territoryId: street.territory_id,
      streetId: street.id,
      action: "note_added",
      message: `Note added to ${street.name}`,
    });
  }

  function assignTerritory(territory: TerritoryRow, employeeId: string) {
    if (!mapData || !managerUser) return;
    const employee = employeeById.get(employeeId);

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        territories: current.territories.map((item) =>
          item.id === territory.id
            ? {
                ...item,
                assigned_employee_id: employeeId,
                updated_by: managerUser.id,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      };
    });
    appendActivity({
      territoryId: territory.id,
      action: "territory_assigned",
      message: `${territory.name} assigned to ${employee?.full_name ?? "employee"}`,
    });
  }

  function renameTerritory(territory: TerritoryRow) {
    if (!mapData || !managerUser) return;
    const nextName = territory.name.endsWith(" Updated")
      ? territory.name.replace(" Updated", "")
      : `${territory.name} Updated`;

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        territories: current.territories.map((item) =>
          item.id === territory.id
            ? {
                ...item,
                name: nextName,
                updated_by: managerUser.id,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      };
    });
    appendActivity({
      territoryId: territory.id,
      action: "territory_renamed",
      message: `${territory.name} renamed to ${nextName}`,
    });
  }

  function updateTerritoryStatus(
    territory: TerritoryRow,
    status: TerritoryStatus,
  ) {
    if (!mapData || !managerUser) return;

    setMapData((current) => {
      if (!current) return current;

      return {
        ...current,
        territories: current.territories.map((item) =>
          item.id === territory.id
            ? {
                ...item,
                status,
                updated_by: managerUser.id,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      };
    });
    appendActivity({
      territoryId: territory.id,
      action: "territory_status_changed",
      message: `${territory.name} status changed to ${humanize(status)}`,
    });
  }

  async function saveTerritorySetup(
    draft: TerritorySetupDraft,
    importedStreets: ImportedStreetPreview[],
  ) {
    if (!mapData) return;
    const actorId = managerUser?.id ?? currentUser?.id ?? null;
    const selectedStreets = importedStreets.filter((street) => street.selected);

    if (!draft.name.trim()) {
      setToast("Territory name is required.");
      return;
    }

    if (!selectedStreets.length) {
      setToast("Select at least one street before saving.");
      return;
    }

    try {
      const territory = createTerritoryRow({
        organizationId: mapData.organization.id,
        name: draft.name,
        polygon: draft.polygon,
        assignedEmployeeId: draft.assignedEmployeeId || null,
        actorId,
        streets: selectedStreets,
      });
      const streets = createStreetRows({
        organizationId: mapData.organization.id,
        territoryId: territory.id,
        assignedEmployeeId: draft.assignedEmployeeId || null,
        actorId,
        streets: selectedStreets,
      });
      const saved = await createMapDataRepository(dataMode).saveTerritorySetup({
        territory,
        streets,
      });

      setMapData((current) =>
        current
          ? {
              ...current,
              territories: [...current.territories, saved.territory],
              streets: [...current.streets, ...saved.streets],
            }
          : current,
      );
      appendActivity({
        territoryId: saved.territory.id,
        action: "territory_created",
        message: `${saved.territory.name} created with ${saved.streets.length} trackable streets`,
      });
      setFilters((current) => ({
        ...current,
        territoryId: saved.territory.id,
      }));
      setSelectedEntity({ type: "territory", item: saved.territory });
      setTerritorySetupOpen(false);
      setToast("Territory saved and streets are ready to track.");
    } catch (saveError) {
      captureError(saveError, "Territory setup failed to save.", {
        area: "territorySetup",
        operation: "saveTerritorySetup",
        metadata: { dataMode },
      });
      setToast(
        saveError instanceof Error
          ? saveError.message
          : "Territory could not be saved.",
      );
    }
  }

  function startRoute() {
    if (!shift) {
      setToast("Start a shift before starting a route.");
      return;
    }
    if (!assignedTerritory) {
      setToast("No assigned territory is available for routing.");
      return;
    }
    if (!mapData || !currentUser) {
      setToast("Route unavailable because map data is not loaded.");
      return;
    }

    const nextPlan = planEmployeeRoute({
      territory: assignedTerritory,
      employee: currentUser,
      streets: mapData.streets,
      leads: mapData.leads,
      customers: mapData.customers,
      jobs: mapData.jobs,
      followUps: mapData.followUps,
      locks: streetLocks,
      currentLocation: routeLocation,
    });
    if (!nextPlan?.steps.length) {
      setToast("Route unavailable. No unfinished unlocked streets are ready.");
      return;
    }

    setRouteActive(true);
    setRouteSheetOpen(true);
    setSelectedEntity(null);
    setTerritoryListOpen(false);
    setLegendOpen(false);
    setToast("Route refreshed.");
  }

  function openRouteRelatedEntity(entity: RouteStep["relatedEntities"][number]) {
    if (!mapData) return;

    const item =
      entity.type === "lead"
        ? mapData.leads.find((lead) => lead.id === entity.id)
        : mapData.customers.find((customer) => customer.id === entity.id);
    if (!item) return;

    setSelectedEntity({ type: entity.type, item } as SelectedMapEntity);
    setRouteSheetOpen(false);
  }

  function handleLocateClick() {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Location is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      () => {
        setLocationError("Location permission was denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }

  return (
    <div className="relative h-dvh w-full bg-[#d7e3dc]">
      <MapContainer
        center={mapConfig.ottawaCenter}
        zoom={mapConfig.defaultZoom}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <MapRenderTimingController />
        <LocationController target={userLocation} />
        <MapClickController
          onMapTap={(latitude, longitude) => {
            setSelectedEntity(null);
            setTerritoryListOpen(false);
            setLegendOpen(false);
            setLeadDraft({
              latitude,
              longitude,
              customerName: "",
              phone: "",
              email: "",
              address: `Pinned location ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
              status: "interested",
              quoteAmount: "",
              notes: "",
            });
          }}
        />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {visibleTerritories.map((territory) => {
          const metrics = territoryMetrics.get(territory.id);
          const color = territoryColorByCompletion(metrics?.progressPercent ?? 0);

          return (
            <Polygon
              eventHandlers={{
                click: (event) => {
                  L.DomEvent.stopPropagation(event);
                  setSelectedEntity({ type: "territory", item: territory });
                  setTerritoryListOpen(false);
                },
              }}
              key={territory.id}
              positions={polygonToLatLngs(territory.polygon_geojson)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.2,
                opacity: 0.95,
                weight:
                  selectedEntityResolved?.type === "territory" &&
                  selectedEntityResolved.item.id === territory.id
                    ? 5
                    : 3,
              }}
            />
          );
        })}
        {visibleStreets.map((street) => (
          <Polyline
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event);
                setSelectedEntity({ type: "street", item: street });
                setTerritoryListOpen(false);
              },
            }}
            key={street.id}
            positions={lineToLatLngs(street.geometry_geojson)}
            pathOptions={{
              color: streetStatusColors[street.status],
              opacity: 0.95,
              weight:
                selectedEntityResolved?.type === "street" &&
                selectedEntityResolved.item.id === street.id
                  ? 8
                  : 5,
            }}
          />
        ))}
        {routePlan?.steps.slice(0, 8).map((step, index) => (
          <Polyline
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event);
                setSelectedEntity({ type: "street", item: step.street });
                setRouteSheetOpen(true);
              },
            }}
            key={`route-street-${step.street.id}`}
            positions={lineToLatLngs(step.street.geometry_geojson)}
            pathOptions={{
              color: index === 0 ? "#7c3aed" : "#a855f7",
              dashArray: index === 0 ? undefined : "8 8",
              opacity: 0.95,
              weight: index === 0 ? 9 : 7,
            }}
          />
        ))}
        {routeOverlayPositions.length > 1 ? (
          <Polyline
            positions={routeOverlayPositions}
            pathOptions={{
              color: "#7c3aed",
              dashArray: "4 10",
              opacity: 0.75,
              weight: 4,
            }}
          />
        ) : null}
        {visibleLeads.map((lead) => (
          <Marker
            eventHandlers={{
              click: (event) => {
                L.DomEvent.stopPropagation(event);
                setSelectedEntity({ type: "lead", item: lead });
                setTerritoryListOpen(false);
              },
            }}
            icon={createLeadIcon(leadStatusColors[lead.status])}
            key={lead.id}
            position={[lead.latitude ?? 0, lead.longitude ?? 0]}
          />
        ))}
        {userLocation ? (
          <CircleMarker
            center={userLocation}
            pathOptions={{
              color: "#2563eb",
              fillColor: "#2563eb",
              fillOpacity: 0.25,
              weight: 3,
            }}
            radius={12}
          />
        ) : null}
      </MapContainer>

      <MapFiltersPanel
        employees={mapData?.employees ?? []}
        filters={filters}
        onChange={setFilters}
        territories={mapData?.territories ?? []}
      />
      {dataMode === "cloud" ? <CloudModeGuard auth={auth} /> : null}

      {shift && currentUser ? (
        <ShiftHud
          currentStreet={activeStreet}
          employee={currentUser}
          nowMs={nowMs}
          onEndShift={endShift}
          shift={shift}
        />
      ) : currentUser ? (
        <StartShiftPanel
          employee={currentUser}
          onStart={startShift}
          territory={assignedTerritory}
        />
      ) : null}

      {shift && mapData && currentUser ? (
        <SmartWarnings
          activeStreet={activeStreet}
          currentUser={currentUser}
          followUps={mapData.followUps}
          locks={streetLocks}
          nowMs={nowMs}
          shift={shift}
          streets={mapData.streets}
          territory={assignedTerritory}
        />
      ) : null}

      <div className="absolute right-3 top-[10.25rem] z-[1190] flex flex-col gap-2 sm:right-5">
        {canManageTerritories ? (
          <button
            className="grid h-12 w-12 place-items-center rounded-full bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 active:scale-95"
            type="button"
            aria-label="Create territory"
            onClick={() => {
              setTerritorySetupOpen(true);
              setTerritoryListOpen(false);
              setLegendOpen(false);
              setSelectedEntity(null);
            }}
          >
            <Plus size={22} />
          </button>
        ) : null}
        <button
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95"
          type="button"
          aria-label="Open search"
          onClick={() => {
            setSearchOpen((open) => !open);
            setTerritoryListOpen(false);
            setLegendOpen(false);
          }}
        >
          <Search size={21} />
        </button>
        <button
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95"
          type="button"
          aria-label="Open territory list"
          onClick={() => {
            setTerritoryListOpen((open) => !open);
            setLegendOpen(false);
            setSelectedEntity(null);
          }}
        >
          <ClipboardList size={21} />
        </button>
        <button
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95"
          type="button"
          aria-label="Locate me"
          onClick={handleLocateClick}
        >
          <LocateFixed size={21} />
        </button>
        <button
          className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950 shadow-lg shadow-zinc-950/15 active:scale-95"
          type="button"
          aria-label="Show map legend"
          onClick={() => {
            setLegendOpen((open) => !open);
            setTerritoryListOpen(false);
          }}
        >
          <Layers3 size={21} />
        </button>
        {currentUser ? (
          <button
            className={`grid h-12 w-12 place-items-center rounded-full shadow-lg shadow-zinc-950/15 active:scale-95 ${
              routeActive
                ? "bg-violet-700 text-white"
                : "bg-white text-zinc-950"
            }`}
            type="button"
            aria-label="Start route"
            onClick={startRoute}
          >
            <Navigation size={21} />
          </button>
        ) : null}
      </div>

      {legendOpen ? <MapLegend /> : null}
      <MapStatusOverlay
        error={error}
        isEmpty={
          !isLoading &&
          !error &&
          visibleTerritories.length === 0 &&
          visibleStreets.length === 0 &&
          visibleLeads.length === 0
        }
        isLoading={isLoading}
      />
      {locationError ? (
        <div className="absolute left-3 right-3 top-[9.25rem] z-[950] mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 shadow-lg">
          {locationError}
        </div>
      ) : null}
      {toast ? <ToastMessage message={toast} /> : null}
      {territoryListOpen && mapData ? (
        <TerritoryListSheet
          activities={activities}
          employees={employeeById}
          leads={mapData.leads}
          metrics={territoryMetrics}
          onClose={() => setTerritoryListOpen(false)}
          onSelect={(territory) => {
            setSelectedEntity({ type: "territory", item: territory });
            setTerritoryListOpen(false);
          }}
          territories={mapData.territories}
        />
      ) : null}
      {searchOpen && mapData ? (
        <SearchSheet
          onClose={() => setSearchOpen(false)}
          onSelect={(entity) => {
            setSelectedEntity(entity);
            setSearchOpen(false);
          }}
          query={searchQuery}
          results={searchResults}
          setQuery={setSearchQuery}
        />
      ) : null}
      {routeSheetOpen && routePlan ? (
        <RoutePlanSheet
          onClose={() => setRouteSheetOpen(false)}
          onOpenRelated={openRouteRelatedEntity}
          onOpenStreet={(street) => {
            setSelectedEntity({ type: "street", item: street });
            setRouteSheetOpen(false);
          }}
          onRefresh={() => setToast("Route refreshed.")}
          onSkipStreet={(street) => updateStreetStatus(street, "skipped")}
          onStartStreet={(street) => {
            updateStreetStatus(street, "active");
            setRouteSheetOpen(false);
          }}
          plan={routePlan}
        />
      ) : null}
      {territorySetupOpen && mapData ? (
        <TerritorySetupSheet
          employees={mapData.employees}
          existingStreets={mapData.streets}
          onClose={() => setTerritorySetupOpen(false)}
          onSave={saveTerritorySetup}
        />
      ) : null}
      {selectedEntityResolved && mapData ? (
        <MapEntitySheet
          activities={activities}
          customers={mapData.customers}
          employees={employeeById}
          entity={selectedEntityResolved}
          followUps={mapData.followUps}
          jobs={mapData.jobs}
          leads={mapData.leads}
          locks={streetLocks}
          metrics={territoryMetrics}
          onAddStreetNote={addStreetNote}
          onAssignTerritory={assignTerritory}
          onAttachPhoto={attachMockPhoto}
          onBookJob={openJobDraft}
          onConvertLead={convertLeadToCustomer}
          onCreateFollowUp={openFollowUpDraft}
          onClose={() => setSelectedEntity(null)}
          onMarkLeadLost={markLeadLost}
          onOverrideLock={overrideStreetLock}
          onRenameTerritory={renameTerritory}
          onSelectEntity={setSelectedEntity}
          onStreetStatusChange={updateStreetStatus}
          onTerritoryStatusChange={updateTerritoryStatus}
          streets={mapData.streets}
          timeline={timelineItems}
          territories={mapData.territories}
        />
      ) : null}
      {shift && activeStreet ? (
        <ActiveStreetPanel
          activeLock={activeStreetLock}
          employee={currentUser}
          nowMs={nowMs}
          onComplete={() => updateStreetStatus(activeStreet, "completed")}
          onHouseChange={incrementHouse}
          onQuickResult={recordQuickResult}
          onSkip={() => updateStreetStatus(activeStreet, "skipped")}
          startedAt={streetStartedAt}
          street={activeStreet}
        />
      ) : null}
      {shift && activeStreet ? (
        <FieldActionBar
          onBook={() => recordQuickResult("booked")}
          onComplete={() => updateStreetStatus(activeStreet, "completed")}
          onHouse={() => incrementHouse(1)}
          onLead={() =>
            setQuickLeadDraft({
              streetId: activeStreet.id,
              result: "interested",
              phone: "",
              name: "",
              quote: "",
              notes: "",
            })
          }
          onQuote={() => recordQuickResult("quoted")}
          onSkip={() => updateStreetStatus(activeStreet, "skipped")}
        />
      ) : null}
      {leadDraft ? (
        <CreateLeadSheet
          draft={leadDraft}
          onChange={setLeadDraft}
          onClose={() => setLeadDraft(null)}
          onSave={saveLead}
        />
      ) : null}
      {jobDraft && mapData ? (
        <BookJobSheet
          draft={jobDraft}
          employees={mapData.employees}
          onChange={setJobDraft}
          onClose={() => setJobDraft(null)}
          onSave={saveJob}
        />
      ) : null}
      {followUpDraft ? (
        <FollowUpSheet
          draft={followUpDraft}
          onChange={setFollowUpDraft}
          onClose={() => setFollowUpDraft(null)}
          onSave={saveFollowUp}
        />
      ) : null}
      {quickLeadDraft ? (
        <QuickLeadSheet
          draft={quickLeadDraft}
          onChange={setQuickLeadDraft}
          onClose={() => setQuickLeadDraft(null)}
          onSave={saveQuickLead}
        />
      ) : null}
      {shiftSummaryOpen && shift ? (
        <ShiftSummarySheet
          nowMs={nowMs}
          onChangeNotes={(notes) =>
            setShift((current) => (current ? { ...current, notes } : current))
          }
          onClose={() => setShiftSummaryOpen(false)}
          shift={shift}
        />
      ) : null}
    </div>
  );
}

function createInitialLocks(data: MapData): StreetLockState[] {
  const employee = data.employees.find((item) => item.role === "employee");
  const manager = data.employees.find((item) => item.role === "manager");
  const activeStreet = data.streets.find((street) => street.status === "active");
  const skippedStreet = data.streets.find((street) => street.status === "skipped");

  return [
    ...(activeStreet && employee
      ? [
          {
            id: "mock-lock-active",
            streetId: activeStreet.id,
            employeeId: employee.id,
            lockedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            releasedAt: null,
            releasedBy: null,
            overrideReason: null,
          },
        ]
      : []),
    ...(skippedStreet && manager
      ? [
          {
            id: "mock-lock-expired",
            streetId: skippedStreet.id,
            employeeId: manager.id,
            lockedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            expiresAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            releasedAt: null,
            releasedBy: null,
            overrideReason: null,
          },
        ]
      : []),
  ];
}

function mapStreetLockRow(row: {
  id: string;
  street_id: string;
  employee_id: string;
  locked_at: string;
  expires_at: string;
  released_at: string | null;
  released_by: string | null;
  override_reason: string | null;
}): StreetLockState {
  return {
    id: row.id,
    streetId: row.street_id,
    employeeId: row.employee_id,
    lockedAt: row.locked_at,
    expiresAt: row.expires_at,
    releasedAt: row.released_at,
    releasedBy: row.released_by,
    overrideReason: row.override_reason,
  };
}

function mapActivityLogRow(row: ActivityLogRow): ActivityLogItem {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {};

  return {
    id: row.id,
    territoryId:
      typeof metadata.territoryId === "string"
        ? metadata.territoryId
        : row.entity_type === "territory"
          ? row.entity_id
          : "",
    streetId:
      typeof metadata.streetId === "string"
        ? metadata.streetId
        : row.entity_type === "street"
          ? row.entity_id
          : undefined,
    actorId: row.actor_id ?? "system",
    action: mapActivityAction(row.action),
    message:
      typeof metadata.message === "string"
        ? metadata.message
        : `${humanize(row.action)} recorded`,
    createdAt: row.created_at,
  };
}

function mapActivityAction(action: string): ActivityLogItem["action"] {
  const allowed: ActivityLogItem["action"][] = [
    "street_started",
    "street_completed",
    "street_skipped",
    "street_do_not_knock",
    "territory_assigned",
    "territory_renamed",
    "territory_status_changed",
    "lock_overridden",
    "note_added",
    "lead_created",
    "lead_converted",
    "follow_up_created",
    "job_booked",
    "lead_lost",
    "photo_attached",
  ];

  return allowed.includes(action as ActivityLogItem["action"])
    ? (action as ActivityLogItem["action"])
    : "note_added";
}

function createInitialActivities(data: MapData): ActivityLogItem[] {
  const employee = data.employees.find((item) => item.role === "employee");
  const territory = data.territories[0];
  const street = data.streets.find((item) => item.territory_id === territory?.id);

  if (!employee || !territory || !street) return [];

  return [
    {
      id: "activity-seed-1",
      territoryId: territory.id,
      streetId: street.id,
      actorId: employee.id,
      action: "street_started",
      message: `${street.name} started by ${employee.full_name}`,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
  ];
}

function createInitialTimeline(data: MapData): TimelineItem[] {
  return [
    ...data.leads.map((lead) => ({
      id: `timeline-lead-${lead.id}`,
      leadId: lead.id,
      customerId: lead.customer_id ?? undefined,
      label: "Lead Created",
      description: `${lead.customer_name} entered as ${leadStatusLabel(lead.status)}.`,
      createdAt: lead.created_at,
    })),
    ...data.jobs.map((job) => ({
      id: `timeline-job-${job.id}`,
      leadId: job.lead_id ?? undefined,
      customerId: job.customer_id ?? undefined,
      jobId: job.id,
      label: job.status === "completed" ? "Completed Job" : "Booked Job",
      description: `${humanize(job.service_type)} job ${humanize(job.status)} for $${job.revenue}.`,
      createdAt: job.created_at,
    })),
    ...data.followUps.map((followUp) => ({
      id: `timeline-follow-up-${followUp.id}`,
      leadId: followUp.lead_id ?? undefined,
      customerId: followUp.customer_id ?? undefined,
      followUpId: followUp.id,
      label: followUp.status === "completed" ? "Follow-up Completed" : "Follow-up",
      description: `${followUp.reason ?? "Follow-up"} due ${followUp.due_at.slice(0, 10)}.`,
      createdAt: followUp.created_at,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function ToastMessage({ message }: { message: string }) {
  return (
    <div className="absolute inset-x-3 top-[8.8rem] z-[1300] mx-auto max-w-md rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-zinc-950/30">
      {message}
    </div>
  );
}

function TerritoryListSheet({
  activities,
  employees,
  leads,
  metrics,
  onClose,
  onSelect,
  territories,
}: {
  activities: ActivityLogItem[];
  employees: Map<string, ProfileRow>;
  leads: LeadRow[];
  metrics: Map<string, TerritoryMetrics>;
  onClose: () => void;
  onSelect: (territory: TerritoryRow) => void;
  territories: TerritoryRow[];
}) {
  return (
    <section className="absolute inset-x-0 bottom-[4.75rem] top-[9rem] z-[1050] px-3 pb-3 sm:px-5">
      <div className="mx-auto flex h-full max-w-md flex-col rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
        <SheetHeader
          eyebrow="Territories"
          icon={<ClipboardList size={18} />}
          onClose={onClose}
          title="Territory list"
        />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {territories.map((territory) => {
            const territoryMetrics = metrics.get(territory.id);
            const assigned = territory.assigned_employee_id
              ? employees.get(territory.assigned_employee_id)?.full_name
              : "Unassigned";

            return (
              <button
                className="w-full rounded-3xl bg-zinc-100 p-4 text-left active:scale-[0.99]"
                data-testid={`territory-card-${territory.id}`}
                key={territory.id}
                type="button"
                onClick={() => onSelect(territory)}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{territory.name}</h2>
                    <p className="truncate text-sm text-zinc-500">
                      {assigned} · {humanize(territory.status)}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                    style={{
                      backgroundColor: territoryColorByCompletion(
                        territoryMetrics?.progressPercent ?? 0,
                      ),
                    }}
                  >
                    {territoryMetrics?.progressPercent ?? 0}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <MiniMetric
                    label="Streets"
                    value={`${territoryMetrics?.completedStreets ?? 0}/${territoryMetrics?.totalTrackableStreets ?? 0}`}
                  />
                  <MiniMetric label="Leads" value={`${territoryMetrics?.leadCount ?? 0}`} />
                  <MiniMetric label="Quotes" value={`${territoryMetrics?.quoteCount ?? 0}`} />
                  <MiniMetric label="Booked" value={`${territoryMetrics?.bookedJobCount ?? 0}`} />
                </div>
                <p className="mt-3 text-sm font-bold">
                  Revenue ${territoryMetrics?.revenue ?? 0}
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-3xl bg-zinc-100 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-zinc-500">
            Latest activity
          </p>
          <ActivityPreview activities={activities} leads={leads} />
        </div>
      </div>
    </section>
  );
}

function MapStatusOverlay({
  error,
  isEmpty,
  isLoading,
}: {
  error: string | null;
  isEmpty: boolean;
  isLoading: boolean;
}) {
  if (!isLoading && !error && !isEmpty) return null;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-1/2 z-[950] mx-auto max-w-sm -translate-y-1/2 rounded-[24px] border border-white/80 bg-white/95 p-4 text-center text-zinc-950 shadow-xl shadow-zinc-950/15 backdrop-blur">
      {isLoading ? (
        <>
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-950" />
          <p className="text-sm font-bold">Loading map data</p>
        </>
      ) : null}
      {error ? (
        <>
          <AlertTriangle className="mx-auto mb-2 text-red-600" size={24} />
          <p className="text-sm font-bold">Map data unavailable</p>
          <p className="mt-1 text-xs text-zinc-500">{error}</p>
        </>
      ) : null}
      {isEmpty ? (
        <>
          <MapPin className="mx-auto mb-2 text-zinc-500" size={24} />
          <p className="text-sm font-bold">No matching map data</p>
          <p className="mt-1 text-xs text-zinc-500">
            Clear a filter to show territories, streets, and leads.
          </p>
        </>
      ) : null}
    </div>
  );
}

function CreateLeadSheet({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: LeadDraft;
  onChange: (draft: LeadDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} title="Create Lead" eyebrow="Map tap">
      <div className="grid gap-2">
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
          placeholder="Customer name optional"
          value={draft.customerName}
          onChange={(event) =>
            onChange({ ...draft, customerName: event.target.value })
          }
        />
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
          placeholder="Phone"
          value={draft.phone}
          onChange={(event) => onChange({ ...draft, phone: event.target.value })}
        />
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
          placeholder="Email optional"
          value={draft.email}
          onChange={(event) => onChange({ ...draft, email: event.target.value })}
        />
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
          placeholder="Address"
          value={draft.address}
          onChange={(event) => onChange({ ...draft, address: event.target.value })}
        />
        <select
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
          value={draft.status}
          onChange={(event) =>
            onChange({ ...draft, status: event.target.value as LeadStatus })
          }
        >
          {leadFilterStatuses
            .filter((status) => status !== "all")
            .map((status) => (
              <option key={status} value={status}>
                {leadStatusLabel(status)}
              </option>
            ))}
        </select>
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
          inputMode="decimal"
          placeholder="Quote amount optional"
          value={draft.quoteAmount}
          onChange={(event) =>
            onChange({ ...draft, quoteAmount: event.target.value })
          }
        />
        <textarea
          className="min-h-20 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-base font-semibold"
          placeholder="Notes"
          value={draft.notes}
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
        <button
          className="h-14 rounded-2xl bg-zinc-950 text-base font-bold text-white"
          type="button"
          onClick={onSave}
        >
          Save Lead
        </button>
      </div>
    </BottomSheet>
  );
}

function BookJobSheet({
  draft,
  employees,
  onChange,
  onClose,
  onSave,
}: {
  draft: JobDraft;
  employees: ProfileRow[];
  onChange: (draft: JobDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} title="Book Job" eyebrow="Customer workflow">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 font-semibold"
          type="date"
          value={draft.date}
          onChange={(event) => onChange({ ...draft, date: event.target.value })}
        />
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 font-semibold"
          type="time"
          value={draft.time}
          onChange={(event) => onChange({ ...draft, time: event.target.value })}
        />
        <select
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 font-semibold"
          value={draft.service}
          onChange={(event) =>
            onChange({
              ...draft,
              service: event.target.value as JobDraft["service"],
            })
          }
        >
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="custom">Custom</option>
        </select>
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 font-semibold"
          inputMode="decimal"
          placeholder="Price"
          value={draft.price}
          onChange={(event) => onChange({ ...draft, price: event.target.value })}
        />
        <select
          className="col-span-2 h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 font-semibold"
          value={draft.assignedEmployeeId}
          onChange={(event) =>
            onChange({ ...draft, assignedEmployeeId: event.target.value })
          }
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
        <textarea
          className="col-span-2 min-h-20 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 font-semibold"
          placeholder="Notes"
          value={draft.notes}
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
        <button
          className="col-span-2 h-14 rounded-2xl bg-zinc-950 font-bold text-white"
          type="button"
          onClick={onSave}
        >
          Save Job
        </button>
      </div>
    </BottomSheet>
  );
}

function FollowUpSheet({
  draft,
  onChange,
  onClose,
  onSave,
}: {
  draft: FollowUpDraft;
  onChange: (draft: FollowUpDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} title="Schedule Follow-up" eyebrow={draft.label}>
      <div className="grid gap-2">
        <input
          className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 font-semibold"
          type="date"
          value={draft.dueAt}
          onChange={(event) => onChange({ ...draft, dueAt: event.target.value })}
        />
        <button
          className="h-14 rounded-2xl bg-zinc-950 font-bold text-white"
          type="button"
          onClick={onSave}
        >
          Save Follow-up
        </button>
      </div>
    </BottomSheet>
  );
}

function SearchSheet({
  onClose,
  onSelect,
  query,
  results,
  setQuery,
}: {
  onClose: () => void;
  onSelect: (entity: SelectedMapEntity) => void;
  query: string;
  results: SelectedMapEntity[];
  setQuery: (query: string) => void;
}) {
  return (
    <BottomSheet onClose={onClose} title="Search" eyebrow="Customers and leads">
      <input
        className="mb-3 h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
        placeholder="Customer, phone, street, address, lead, email"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="space-y-2">
        {results.map((entity) => (
          <button
            className="w-full rounded-2xl bg-zinc-100 p-3 text-left"
            key={`${entity.type}-${entity.item.id}`}
            type="button"
            onClick={() => onSelect(entity)}
          >
            <p className="text-sm font-bold">
              {entity.type === "lead"
                ? entity.item.customer_name
                : entity.type === "customer"
                  ? entity.item.name
                  : entity.item.name}
            </p>
            <p className="text-xs text-zinc-500">{humanize(entity.type)}</p>
          </button>
        ))}
        {query && !results.length ? (
          <p className="rounded-2xl bg-zinc-100 p-3 text-sm text-zinc-500">
            No results.
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function BottomSheet({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <section className="absolute inset-x-0 bottom-[4.75rem] z-[1230] px-3 pb-3 sm:px-5">
      <div className="mx-auto max-h-[72dvh] max-w-md overflow-y-auto rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
        <SheetHeader eyebrow={eyebrow} onClose={onClose} title={title} />
        {children}
      </div>
    </section>
  );
}

function ActivityPreview({
  activities,
}: {
  activities: ActivityLogItem[];
  leads: LeadRow[];
}) {
  return (
    <div className="space-y-2" data-testid="activity-log-preview">
      {activities.slice(0, 5).map((activity) => (
        <p className="rounded-2xl bg-white px-3 py-2 text-sm" key={activity.id}>
          <span className="font-semibold">{humanize(activity.action)}:</span>{" "}
          {activity.message}
        </p>
      ))}
      {!activities.length ? (
        <p className="rounded-2xl bg-white px-3 py-2 text-sm text-zinc-500">
          No activity yet.
        </p>
      ) : null}
    </div>
  );
}
