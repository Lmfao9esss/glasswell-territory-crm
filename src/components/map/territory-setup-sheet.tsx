"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

import {
  createManualStreetPreview,
  importStreetsForTerritory,
  mockImportStreetsForTerritory,
} from "@/lib/map/osm-street-import";
import type { ProfileRow, StreetRow } from "@/lib/map/types";
import {
  employeeOptions,
  territorySetupPresets,
  type ImportedStreetPreview,
  type TerritorySetupDraft,
} from "@/lib/map/territory-setup";
import { Metric, SheetHeader } from "@/components/map/sheet-primitives";

export function TerritorySetupSheet({
  employees,
  existingStreets,
  onClose,
  onSave,
}: {
  employees: ProfileRow[];
  existingStreets: StreetRow[];
  onClose: () => void;
  onSave: (
    draft: TerritorySetupDraft,
    importedStreets: ImportedStreetPreview[],
  ) => void;
}) {
  const firstPreset = territorySetupPresets[0];
  const [draft, setDraft] = useState<TerritorySetupDraft>({
    name: firstPreset.name,
    assignedEmployeeId: "",
    presetId: firstPreset.id,
    polygon: firstPreset.polygon,
  });
  const [streets, setStreets] = useState<ImportedStreetPreview[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualHouses, setManualHouses] = useState("20");
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState(
    "Choose a demo polygon, import OSM streets, then review before saving.",
  );
  const assignableEmployees = employeeOptions(employees);
  const selectedCount = streets.filter((street) => street.selected).length;
  const duplicateCount = streets.filter((street) => street.duplicateStreetId).length;

  async function handleImport() {
    setIsImporting(true);
    setMessage(
      "Importing from OpenStreetMap. Public Overpass results are cached to avoid repeated requests.",
    );

    try {
      const result = await importStreetsForTerritory({
        polygon: draft.polygon,
        existingStreets,
      });
      setStreets(result.streets);
      setMessage(
        result.warning ??
          `${result.streets.length} streets imported from ${result.source}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `OSM import failed: ${error.message}`
          : "OSM import failed. Use mock import or manual street entry.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  function handleMockImport() {
    try {
      const result = mockImportStreetsForTerritory({
        polygon: draft.polygon,
        existingStreets,
      });
      setStreets(result.streets);
      setMessage(result.warning ?? "Demo streets imported.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Demo import could not run.",
      );
    }
  }

  function handlePresetChange(presetId: string) {
    const preset = territorySetupPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setDraft((current) => ({
      ...current,
      name: current.name === "" ? preset.name : current.name,
      presetId: preset.id,
      polygon: preset.polygon,
    }));
    setStreets([]);
    setMessage("Polygon changed. Import streets again for this boundary.");
  }

  function toggleStreet(importId: string) {
    setStreets((current) =>
      current.map((street) =>
        street.importId === importId
          ? { ...street, selected: !street.selected }
          : street,
      ),
    );
  }

  function addManualStreet() {
    const houses = Number.parseInt(manualHouses, 10);
    if (!manualName.trim()) {
      setMessage("Manual street name is required.");
      return;
    }
    if (Number.isNaN(houses) || houses < 0) {
      setMessage("Estimated houses must be zero or higher.");
      return;
    }

    const street = createManualStreetPreview({
      name: manualName,
      polygon: draft.polygon,
      estimatedHouses: houses,
      existingStreets,
    });
    setStreets((current) => [...current, street]);
    setManualName("");
    setManualHouses("20");
    setMessage(`${street.name} added to the preview.`);
  }

  return (
    <section className="absolute inset-x-0 bottom-[4.75rem] top-[5.75rem] z-[1400] px-3 pb-3 sm:px-5">
      <div className="mx-auto flex max-h-full max-w-md flex-col rounded-[28px] border border-white/80 bg-white/95 p-4 text-zinc-950 shadow-2xl shadow-zinc-950/25 backdrop-blur">
        <SheetHeader
          eyebrow="Territory setup"
          onClose={onClose}
          title="Create Territory"
          subtitle="Import streets before saving"
        />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                Territory name
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold outline-none focus:border-zinc-950"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                Boundary
              </span>
              <select
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
                value={draft.presetId}
                onChange={(event) => handlePresetChange(event.target.value)}
              >
                {territorySetupPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-zinc-500">
                Assign employee
              </span>
              <select
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-base font-semibold"
                value={draft.assignedEmployeeId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    assignedEmployeeId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {assignableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-3xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
              {message}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-3 text-sm font-black text-white active:scale-[0.98] disabled:opacity-60"
                type="button"
                disabled={isImporting}
                onClick={handleImport}
              >
                <Upload size={18} />
                {isImporting ? "Importing" : "Import streets"}
              </button>
              <button
                className="h-14 rounded-2xl bg-zinc-100 px-3 text-sm font-black text-zinc-950 active:scale-[0.98]"
                type="button"
                onClick={handleMockImport}
              >
                Mock import streets
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Found" value={`${streets.length}`} />
              <Metric label="Selected" value={`${selectedCount}`} />
              <Metric label="Existing" value={`${duplicateCount}`} />
            </div>
          </div>

          <section className="mt-4">
            <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">
              Import preview
            </h3>
            <div className="space-y-2">
              {streets.length ? (
                streets.map((street) => (
                  <label
                    className={`flex min-h-16 items-center gap-3 rounded-3xl p-3 ${
                      street.duplicateStreetId
                        ? "bg-red-50 text-red-950"
                        : "bg-zinc-100 text-zinc-950"
                    }`}
                    key={street.importId}
                  >
                    <input
                      className="h-6 w-6 accent-zinc-950"
                      type="checkbox"
                      checked={street.selected}
                      disabled={Boolean(street.duplicateStreetId)}
                      onChange={() => toggleStreet(street.importId)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold">
                        {street.name}
                      </span>
                      <span className="block text-xs font-semibold text-zinc-500">
                        {street.estimated_houses} estimated houses -{" "}
                        {street.source === "overpass"
                          ? "OpenStreetMap"
                          : street.source === "manual"
                            ? "Manual"
                            : "Demo import"}
                        {street.duplicateStreetId ? " - already exists" : ""}
                      </span>
                    </span>
                  </label>
                ))
              ) : (
                <p className="rounded-3xl bg-zinc-100 p-4 text-sm font-semibold text-zinc-500">
                  No streets imported yet.
                </p>
              )}
            </div>
          </section>

          <section className="mt-4 rounded-3xl bg-zinc-100 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase text-zinc-500">
              Manual fallback
            </h3>
            <div className="grid grid-cols-[1fr_5.5rem] gap-2">
              <input
                className="h-12 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-zinc-950"
                placeholder="Street name"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
              />
              <input
                className="h-12 rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-zinc-950"
                inputMode="numeric"
                aria-label="Estimated houses"
                value={manualHouses}
                onChange={(event) => setManualHouses(event.target.value)}
              />
            </div>
            <button
              className="mt-2 h-12 w-full rounded-2xl bg-white text-sm font-black text-zinc-950 active:scale-[0.98]"
              type="button"
              onClick={addManualStreet}
            >
              Add manual street
            </button>
          </section>
        </div>
        <button
          className="mt-3 h-14 rounded-2xl bg-emerald-700 text-base font-black text-white active:scale-[0.98]"
          type="button"
          onClick={() => onSave(draft, streets)}
        >
          Save territory
        </button>
      </div>
    </section>
  );
}
