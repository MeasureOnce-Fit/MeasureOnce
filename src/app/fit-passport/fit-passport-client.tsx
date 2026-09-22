"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Download, Plus, Trash2, X } from "lucide-react";

import type { CatalogCollection, FitAnchorDraft, FitProfile, MeasurementUnit, ProfileMeasurementDraft } from "@/lib/identity/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import styles from "./fit-passport.module.css";

const POLICY_VERSION = "2026-09-18";
const bodyMeasurementFields = [
  { region: "chest_bust", label: "Chest / bust", hint: "Fullest point" },
  { region: "waist", label: "Waist", hint: "Natural waist" },
  { region: "hip_seat", label: "Hip / seat", hint: "Fullest point" },
  { region: "shoulder_cross_back", label: "Shoulder width", hint: "Across the back" },
  { region: "body_length", label: "Body length", hint: "Shoulder to hem" },
  { region: "sleeve_length", label: "Sleeve length", hint: "Shoulder to wrist" },
  { region: "inseam", label: "Inseam", hint: "Crotch seam to ankle" },
] as const;
type BodyMeasurementRegion = (typeof bodyMeasurementFields)[number]["region"];
type MeasurementDraft = Partial<Record<BodyMeasurementRegion, string>>;
type KnownSizeCategory = "Dresses" | "Tops" | "Jeans" | "Jackets" | "Shirts & Tees" | "Trousers";
type KnownSizeCollection = Exclude<CatalogCollection, "both">;
type KnownSizeRegion = "chest_bust" | "waist" | "hip_seat" | "shoulder_cross_back" | "body_length" | "sleeve_length" | "inseam";
type KnownSizeObservationDraft = Partial<Record<KnownSizeRegion, string>>;

type PageState = "loading" | "ready" | "unauthorized" | "unavailable" | "error";
type Notice = { tone: "success" | "error" | "conflict"; message: string } | null;

const previewProfiles: FitProfile[] = [
  { id: "preview-jane", retailerId: "preview", ownerId: "preview", kind: "self", nickname: "Jane", catalogCollection: "women", ownerPermissionConfirmed: true, status: "active", version: 1, createdAt: "2026-09-18T12:00:00Z", updatedAt: "2026-09-18T12:00:00Z", measurements: [], preferences: [{ category: "Jeans", dimension: "ease", preference: "balanced" }], anchors: [{ evidenceKind: "exact_garment", brandId: "Atelier North", productId: "mo-women-001", category: "Jeans", sizeLabel: "28", observations: { waist: "just_right", length: "just_right" } }, { evidenceKind: "exact_garment", brandId: "Softline", productId: "mo-women-014", category: "Shirts", sizeLabel: "S", observations: { shoulder: "just_right" } }] },
  { id: "preview-alex", retailerId: "preview", ownerId: "preview", kind: "additional_member", nickname: "Alex", catalogCollection: "men", ownerPermissionConfirmed: true, status: "active", version: 1, createdAt: "2026-09-18T12:00:00Z", updatedAt: "2026-09-18T12:00:00Z", measurements: [], preferences: [], anchors: [{ evidenceKind: "exact_garment", brandId: "Common Form", productId: "mo-men-004", category: "Trousers", sizeLabel: "32 × 30", observations: { waist: "just_right", inseam: "right_length" } }] },
  { id: "preview-morgan", retailerId: "preview", ownerId: "preview", kind: "additional_member", nickname: "Morgan", catalogCollection: "both", ownerPermissionConfirmed: true, status: "active", version: 1, createdAt: "2026-09-18T12:00:00Z", updatedAt: "2026-09-18T12:00:00Z", measurements: [], preferences: [], anchors: [] },
];

const knownSizeCategories: Record<KnownSizeCollection, KnownSizeCategory[]> = {
  women: ["Dresses", "Tops", "Jeans", "Jackets"],
  men: ["Shirts & Tees", "Trousers", "Jeans", "Jackets"],
};
type KnownSizeReference = { id: string; version: string; brandName: string; category: KnownSizeCategory; referenceCategory: string; sizeLabel: string; regions: KnownSizeRegion[] };
const knownSizeFields: Record<KnownSizeRegion, { label: string; isLength?: boolean }> = {
  chest_bust: { label: "Chest / bust" }, waist: { label: "Waist" }, hip_seat: { label: "Hip / seat" },
  shoulder_cross_back: { label: "Shoulder width", isLength: true }, body_length: { label: "Body length", isLength: true }, sleeve_length: { label: "Sleeve length", isLength: true }, inseam: { label: "Inseam", isLength: true },
};

function anchorBrand(anchor: FitAnchorDraft) {
  return anchor.evidenceKind === "exact_garment" ? anchor.brandId : anchor.brandName;
}

function anchorStatus(anchor: FitAnchorDraft) {
  return anchor.evidenceKind === "category_size_reference" ? "Verified reference" : anchor.evidenceKind === "remembered_size_context" ? "Context only" : "Exact garment";
}

function displayCategory(category: string) {
  return category === "Outerwear" ? "Jackets" : category === "Denim" ? "Jeans" : category;
}

function normalizedLabel(value: string) {
  return value.trim().toLocaleLowerCase();
}

function anchorKey(anchor: FitAnchorDraft, index: number) {
  return anchor.evidenceKind === "exact_garment" ? `${anchor.productId}:${index}` : anchor.evidenceKind === "category_size_reference" ? `${anchor.referenceId}:${index}` : `${anchor.brandName}:${anchor.category}:${anchor.sizeLabel}:${index}`;
}

function initials(nickname: string) {
  return nickname.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

function anchorSummary(profile: FitProfile) {
  const categories = Array.from(new Set(profile.anchors.map((anchor) => displayCategory(anchor.category))));
  return categories.length ? categories.slice(0, 3).join(", ") : "Add a garment to improve recommendations";
}

function draftFromProfile(profile: FitProfile, unit: MeasurementUnit): MeasurementDraft {
  return Object.fromEntries(profile.measurements.filter((measurement) => measurement.method === "body" && bodyMeasurementFields.some((field) => field.region === measurement.region)).map((measurement) => {
    const converted = measurement.unit === unit ? measurement.value : unit === "cm" ? measurement.value * 2.54 : measurement.value / 2.54;
    return [measurement.region, String(Number(converted.toFixed(2)))];
  })) as MeasurementDraft;
}

async function apiMessage(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error ?? "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export default function FitPassportClient() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [profiles, setProfiles] = useState<FitProfile[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<FitProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [permission, setPermission] = useState(false);
  const [storageConsent, setStorageConsent] = useState(false);
  const [newProfileKind, setNewProfileKind] = useState<"self" | "additional_member">("self");
  const [catalogCollection, setCatalogCollection] = useState<CatalogCollection>("both");
  const [knownSizeCollection, setKnownSizeCollection] = useState<KnownSizeCollection | "">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>("in");
  const [measurementDraft, setMeasurementDraft] = useState<MeasurementDraft>({});
  const [knownSizeOpen, setKnownSizeOpen] = useState(false);
  const [knownSizeBrand, setKnownSizeBrand] = useState("");
  const [knownSizeCustomBrand, setKnownSizeCustomBrand] = useState("");
  const [knownSizeCategory, setKnownSizeCategory] = useState<KnownSizeCategory | "">("");
  const [knownSizeLabel, setKnownSizeLabel] = useState("");
  const [knownSizeCustomLabel, setKnownSizeCustomLabel] = useState("");
  const [knownSizeObservations, setKnownSizeObservations] = useState<KnownSizeObservationDraft>({});
  const [knownSizeReferences, setKnownSizeReferences] = useState<KnownSizeReference[]>([]);

  const loadProfiles = useCallback(async () => {
    if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("preview") === "ready") {
      setPreviewMode(true);
      setProfiles(previewProfiles);
      setPageState("ready");
      return;
    }
    try {
      const response = await fetch("/api/profiles", { cache: "no-store" });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      const body = await response.json() as { profiles: FitProfile[] };
      setProfiles(body.profiles);
      setPageState("ready");
    } catch {
      setPageState("error");
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadProfiles(), 0);
    return () => window.clearTimeout(task);
  }, [loadProfiles]);

  useEffect(() => {
    if (!addOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAddOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addOpen]);

  useEffect(() => {
    const collection = selected?.catalogCollection === "both" ? knownSizeCollection : selected?.catalogCollection;
    if (!collection || !knownSizeCategory) return;
    const referenceCategory = knownSizeCategory === "Jackets" ? "Outerwear" : knownSizeCategory === "Jeans" ? "Denim" : knownSizeCategory;
    let cancelled = false;
    void fetch(`/api/fit/profile-category-size-reference?collection=${collection}&category=${encodeURIComponent(referenceCategory)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = await response.json() as { references: Array<{ id: string; version: string; brandName: string; category: string; sizeLabel: string; supportedRegions: string[] }> };
        if (cancelled) return;
        const allowedRegions = new Set<KnownSizeRegion>(["chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length", "sleeve_length", "inseam"]);
        setKnownSizeReferences(body.references.map((reference) => ({ ...reference, category: knownSizeCategory, referenceCategory, regions: reference.supportedRegions.filter((region): region is KnownSizeRegion => allowedRegions.has(region as KnownSizeRegion)) })));
      })
      .catch(() => { if (!cancelled) setKnownSizeReferences([]); });
    return () => { cancelled = true; };
  }, [selected?.catalogCollection, knownSizeCollection, knownSizeCategory]);

  async function signOut() {
    setBusy("sign-out");
    setNotice(null);
    try {
      await fetch("/api/showcase/session", { method: "DELETE" });
      try {
        await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
      } catch {
        // The server has already cleared the protected application session.
      }
      setProfiles([]);
      setPageState("unauthorized");
    } finally {
      setBusy(null);
    }
  }

  async function createProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setNotice(null);
    try {
      if (previewMode) {
        const profile: FitProfile = { id: `preview-${Date.now()}`, retailerId: "preview", ownerId: "preview", kind: newProfileKind, nickname: nickname.trim(), catalogCollection, ownerPermissionConfirmed: newProfileKind === "self" || permission, status: "active", version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), measurements: [], preferences: [], anchors: [] };
        setProfiles((current) => [...current, profile]);
        setNickname(""); setPermission(false); setStorageConsent(false); setAddOpen(false);
        setNotice({ tone: "success", message: `${profile.nickname}'s fictional preview profile was added locally.` });
        return;
      }
      if (storageConsent) {
        const consentResponse = await fetch("/api/consent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ granted: true, policyVersion: POLICY_VERSION }) });
        if (consentResponse.status === 401) return setPageState("unauthorized");
        if (consentResponse.status === 503) return setPageState("unavailable");
        if (!consentResponse.ok) throw new Error(await apiMessage(consentResponse));
      }
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: newProfileKind,
          nickname: nickname.trim(),
          catalogCollection,
          ownerPermissionConfirmed: newProfileKind === "self" || permission,
          measurements: [],
          preferences: [],
          anchors: [],
        }),
      });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) {
        const message = response.status === 403
          ? "Allow Fit Passport storage before adding a person."
          : await apiMessage(response);
        return setNotice({ tone: "error", message });
      }
      const { profile } = await response.json() as { profile: FitProfile };
      setProfiles((current) => [...current, profile]);
      setPageState("ready");
      setNickname("");
      setPermission(false);
      setStorageConsent(false);
      setAddOpen(false);
      setNotice({ tone: "success", message: `${profile.nickname}'s fit profile was added.` });
    } catch {
      setNotice({ tone: "error", message: "We could not add this profile. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function openProfile(profile: FitProfile) {
    setSelected(profile);
    setDetailLoading(true);
    setNotice(null);
    resetKnownSizeEditor();
    try {
      if (previewMode) {
        setNickname(profile.nickname);
        setCatalogCollection(profile.catalogCollection);
        setMeasurementUnit("in");
        setMeasurementDraft(draftFromProfile(profile, "in"));
        setDetailLoading(false);
        return;
      }
      const response = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}`, { cache: "no-store" });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (response.status === 404) {
        setSelected(null);
        return setNotice({ tone: "error", message: "That profile is no longer available." });
      }
      if (!response.ok) throw new Error(await apiMessage(response));
      const body = await response.json() as { profile: FitProfile };
      const upgraded = await upgradeRememberedAnchors(body.profile);
      setSelected(upgraded.profile);
      setProfiles((current) => current.map((item) => item.id === upgraded.profile.id ? upgraded.profile : item));
      setNickname(upgraded.profile.nickname);
      setCatalogCollection(upgraded.profile.catalogCollection);
      setMeasurementUnit("in");
      setMeasurementDraft(draftFromProfile(upgraded.profile, "in"));
      if (upgraded.changed) setNotice({ tone: "success", message: "A saved size was matched to its verified category chart." });
    } catch {
      setNotice({ tone: "error", message: "We could not open this profile. Try again." });
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function upgradeRememberedAnchors(profile: FitProfile): Promise<{ profile: FitProfile; changed: boolean }> {
    if (profile.catalogCollection === "both" || !profile.anchors.some((anchor) => anchor.evidenceKind === "remembered_size_context")) {
      return { profile, changed: false };
    }
    const collection = profile.catalogCollection;
    const cache = new Map<string, KnownSizeReference[]>();
    const anchors: FitAnchorDraft[] = [];
    let changed = false;
    for (const anchor of profile.anchors) {
      if (anchor.evidenceKind !== "remembered_size_context") {
        anchors.push(anchor);
        continue;
      }
      const referenceCategory = anchor.category === "Jackets" ? "Outerwear" : anchor.category === "Jeans" ? "Denim" : anchor.category;
      let references = cache.get(referenceCategory);
      if (!references) {
        const response = await fetch(`/api/fit/profile-category-size-reference?collection=${collection}&category=${encodeURIComponent(referenceCategory)}`, { cache: "no-store" });
        if (!response.ok) {
          anchors.push(anchor);
          continue;
        }
        const body = await response.json() as { references: Array<{ id: string; version: string; brandName: string; category: string; sizeLabel: string; supportedRegions: string[] }> };
        references = body.references.map((reference) => ({ ...reference, category: displayCategory(reference.category) as KnownSizeCategory, referenceCategory: reference.category, regions: [] }));
        cache.set(referenceCategory, references);
      }
      const reference = references.find((candidate) => normalizedLabel(candidate.brandName) === normalizedLabel(anchor.brandName) && normalizedLabel(candidate.sizeLabel) === normalizedLabel(anchor.sizeLabel));
      if (!reference) {
        anchors.push(anchor);
        continue;
      }
      changed = true;
      anchors.push({ evidenceKind: "category_size_reference", referenceId: reference.id, referenceVersion: reference.version, brandName: reference.brandName, category: reference.referenceCategory, sizeLabel: reference.sizeLabel, observations: anchor.observations });
    }
    if (!changed) return { profile, changed: false };
    const response = await fetch(`/api/profiles/${encodeURIComponent(profile.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: profile.version, patch: { anchors } }),
    });
    if (!response.ok) return { profile, changed: false };
    const body = await response.json() as { profile: FitProfile };
    return { profile: body.profile, changed: true };
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy("update");
    setNotice(null);
    try {
      const retainedMeasurements = selected.measurements.filter((measurement) => measurement.method !== "body" || !bodyMeasurementFields.some((field) => field.region === measurement.region));
      const enteredMeasurements: ProfileMeasurementDraft[] = bodyMeasurementFields.flatMap((field) => {
        const value = Number(measurementDraft[field.region]);
        return Number.isFinite(value) && value > 0 ? [{
          region: field.region,
          value,
          unit: measurementUnit,
          method: "body" as const,
          source: "Fit Passport entry",
        }] : [];
      });
      const measurements = [...retainedMeasurements, ...enteredMeasurements];
      if (previewMode) {
        const profile = { ...selected, nickname: nickname.trim(), catalogCollection, measurements, version: selected.version + 1, updatedAt: new Date().toISOString() };
        setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
        setSelected(profile);
        setNotice({ tone: "success", message: "Fictional preview profile updated locally." });
        return;
      }
      const response = await fetch(`/api/profiles/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: selected.version, patch: { nickname: nickname.trim(), catalogCollection, measurements } }),
      });
      if (response.status === 409) {
        return setNotice({ tone: "conflict", message: "This profile changed in another session. Reload it before saving again." });
      }
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      const { profile } = await response.json() as { profile: FitProfile };
      setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
      setSelected(profile);
      setNotice({ tone: "success", message: "Profile changes saved." });
    } catch {
      setNotice({ tone: "error", message: "We could not save those changes. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function deleteProfile() {
    if (!selected) return;
    setBusy("delete-profile");
    setNotice(null);
    try {
      if (previewMode) {
        setProfiles((current) => current.filter((item) => item.id !== selected.id));
        setSelected(null);
        setNotice({ tone: "success", message: "Fictional preview profile removed locally." });
        return;
      }
      const response = await fetch(`/api/profiles/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        headers: { "Idempotency-Key": `profile-delete:${crypto.randomUUID()}` },
      });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      setProfiles((current) => current.filter((item) => item.id !== selected.id));
      setSelected(null);
      setNotice({ tone: "success", message: "The fit profile was removed." });
    } catch {
      setNotice({ tone: "error", message: "We could not remove this profile. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function updateConsent(granted: boolean) {
    setBusy(granted ? "consent-on" : "consent-off");
    setNotice(null);
    try {
      if (previewMode) {
        setNotice({ tone: "success", message: granted ? "Preview saving is shown as allowed; no data was written." : "Preview saving is shown as paused; no data was written." });
        return;
      }
      const response = await fetch("/api/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granted, policyVersion: POLICY_VERSION }),
      });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      setNotice({
        tone: "success",
        message: granted ? "Fit Passport saving is allowed." : "Fit Passport saving is paused. Existing data remains until you remove it.",
      });
    } catch {
      setNotice({ tone: "error", message: "We could not update your fit-data permission." });
    } finally {
      setBusy(null);
    }
  }

  async function downloadExport() {
    setBusy("export");
    setNotice(null);
    try {
      const response = previewMode
        ? new Response(JSON.stringify({ schemaVersion: "1.0-preview", profiles }, null, 2), { headers: { "Content-Type": "application/json" } })
        : await fetch("/api/account/export", { cache: "no-store" });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "measureonce-fit-passport.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: "success", message: "Your Fit Passport export is ready." });
    } catch {
      setNotice({ tone: "error", message: "We could not prepare your export. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function deleteFitPassport() {
    setBusy("delete-account");
    setNotice(null);
    try {
      if (previewMode) {
        setProfiles([]);
        setConfirmDelete(false);
        setNotice({ tone: "success", message: "Fictional preview profiles were cleared locally. No data was written." });
        return;
      }
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Idempotency-Key": `passport-delete:${crypto.randomUUID()}` },
      });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      setProfiles([]);
      setConfirmDelete(false);
      setNotice({ tone: "success", message: "Fit Passport deleted. Your MeasureOnce shopping account remains active." });
    } catch {
      setNotice({ tone: "error", message: "We could not delete your Fit Passport. Try again." });
    } finally {
      setBusy(null);
    }
  }

  const signedInName = profiles.find((profile) => profile.kind === "self")?.nickname ?? "My account";
  const hasSelfProfile = profiles.some((profile) => profile.kind === "self");
  function openAddProfile() {
    setNickname("");
    setPermission(false);
    setStorageConsent(false);
    setCatalogCollection("both");
    setKnownSizeCollection("");
    setNewProfileKind(hasSelfProfile ? "additional_member" : "self");
    setAddOpen(true);
  }

  function changeMeasurementUnit(nextUnit: MeasurementUnit) {
    if (nextUnit === measurementUnit) return;
    setMeasurementDraft((current) => Object.fromEntries(Object.entries(current).map(([region, value]) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return [region, value];
      const converted = nextUnit === "cm" ? numeric * 2.54 : numeric / 2.54;
      return [region, String(Number(converted.toFixed(2)))];
    })) as MeasurementDraft);
    setMeasurementUnit(nextUnit);
  }

  function resetKnownSizeEditor() {
    setKnownSizeOpen(false);
    setKnownSizeBrand("");
    setKnownSizeCustomBrand("");
    setKnownSizeCategory("");
    setKnownSizeLabel("");
    setKnownSizeCustomLabel("");
    setKnownSizeObservations({});
    setKnownSizeCollection("");
    setKnownSizeReferences([]);
  }

  async function saveKnownSize() {
    if (!selected || !knownSizeCategory) return;
    const brandName = (knownSizeBrand === "not-listed" ? knownSizeCustomBrand : knownSizeBrand).trim();
    if (!brandName || !knownSizeLabelValue) return;
    const reference = knownSizeReferences.find((candidate) => knownSizeBrand !== "not-listed" && candidate.brandName === brandName && candidate.category === knownSizeCategory && candidate.sizeLabel === knownSizeLabelValue);
    const anchor: FitAnchorDraft = reference
      ? { evidenceKind: "category_size_reference", referenceId: reference.id, referenceVersion: reference.version, brandName, category: reference.referenceCategory, sizeLabel: reference.sizeLabel, observations: knownSizeObservations }
      : { evidenceKind: "remembered_size_context", brandName, category: knownSizeCategory, sizeLabel: knownSizeLabelValue, observations: knownSizeObservations };
    const duplicate = selected.anchors.some((candidate) => {
      if (candidate.evidenceKind !== anchor.evidenceKind || normalizedLabel(candidate.category) !== normalizedLabel(anchor.category) || normalizedLabel(candidate.sizeLabel) !== normalizedLabel(anchor.sizeLabel)) return false;
      return anchor.evidenceKind === "category_size_reference"
        ? candidate.evidenceKind === "category_size_reference" && candidate.referenceId === anchor.referenceId
        : candidate.evidenceKind === "remembered_size_context" && normalizedLabel(candidate.brandName) === normalizedLabel(anchor.brandName);
    });
    if (duplicate) {
      setNotice({ tone: "error", message: "This known size is already saved for this profile." });
      return;
    }
    setBusy("known-size");
    setNotice(null);
    try {
      const anchors = [...selected.anchors, anchor];
      if (previewMode) {
        const profile = { ...selected, anchors, version: selected.version + 1, updatedAt: new Date().toISOString() };
        setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
        setSelected(profile);
        setNotice({ tone: "success", message: anchor.evidenceKind === "category_size_reference" ? "Verified category size reference saved locally in this preview." : "Saved as context — not used alone for recommendations." });
        resetKnownSizeEditor();
        return;
      }
      const response = await fetch(`/api/profiles/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: selected.version, patch: { anchors } }),
      });
      if (response.status === 409) return setNotice({ tone: "conflict", message: "This profile changed in another session. Reload it before saving again." });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      const { profile } = await response.json() as { profile: FitProfile };
      setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
      setSelected(profile);
      setNotice({ tone: "success", message: anchor.evidenceKind === "category_size_reference" ? "Verified category size reference saved." : "Saved as context — not used alone for recommendations." });
      resetKnownSizeEditor();
    } catch {
      setNotice({ tone: "error", message: "We could not save this known size. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function removeAnchor(index: number) {
    if (!selected) return;
    setBusy(`remove-anchor:${index}`);
    setNotice(null);
    try {
      const anchors = selected.anchors.filter((_, candidateIndex) => candidateIndex !== index);
      if (previewMode) {
        const profile = { ...selected, anchors, version: selected.version + 1, updatedAt: new Date().toISOString() };
        setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
        setSelected(profile);
        setNotice({ tone: "success", message: "Fit evidence removed from this preview profile." });
        return;
      }
      const response = await fetch(`/api/profiles/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: selected.version, patch: { anchors } }),
      });
      if (response.status === 409) return setNotice({ tone: "conflict", message: "This profile changed in another session. Reload it before removing evidence." });
      if (response.status === 401) return setPageState("unauthorized");
      if (response.status === 503) return setPageState("unavailable");
      if (!response.ok) throw new Error(await apiMessage(response));
      const { profile } = await response.json() as { profile: FitProfile };
      setProfiles((current) => current.map((item) => item.id === profile.id ? profile : item));
      setSelected(profile);
      setNotice({ tone: "success", message: "Fit evidence removed." });
    } catch {
      setNotice({ tone: "error", message: "We could not remove this fit evidence. Try again." });
    } finally {
      setBusy(null);
    }
  }

  const activeKnownSizeCollection: KnownSizeCollection | "" = selected?.catalogCollection === "both"
    ? knownSizeCollection
    : selected?.catalogCollection ?? "";
  const availableKnownSizeCategories = activeKnownSizeCollection ? knownSizeCategories[activeKnownSizeCollection] : [];
  const availableKnownSizeBrands = activeKnownSizeCollection
    ? Array.from(new Set(knownSizeReferences.map((reference) => reference.brandName)))
    : [];
  const knownSizeBrandName = (knownSizeBrand === "not-listed" ? knownSizeCustomBrand : knownSizeBrand).trim();
  const availableKnownSizeReferences = knownSizeBrand === "not-listed" ? [] : knownSizeReferences.filter((candidate) => candidate.brandName === knownSizeBrandName && candidate.category === knownSizeCategory);
  const knownSizeLabelValue = knownSizeLabel === "not-listed" ? knownSizeCustomLabel.trim() : knownSizeLabel.trim();
  const selectedKnownSizeReference = availableKnownSizeReferences.find((candidate) => candidate.sizeLabel === knownSizeLabelValue);
  const knownSizeRegions = selectedKnownSizeReference?.regions ?? (knownSizeCategory === "Dresses" ? ["chest_bust", "waist", "hip_seat", "body_length"] : knownSizeCategory === "Tops" || knownSizeCategory === "Jackets" ? ["chest_bust", "shoulder_cross_back", "body_length", "sleeve_length"] : knownSizeCategory === "Jeans" ? ["waist", "hip_seat", "inseam"] : []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">MEASURE<span>ONCE</span></Link>
        <nav aria-label="Store sections"><Link href="/shop/women">Women</Link><Link href="/shop/men">Men</Link><Link href="/about">About</Link><Link href="/about#fit">How fit works</Link></nav>
        <div className={styles.account}><span>{initials(signedInName) || "MO"}</span><b>{signedInName}</b>{pageState === "ready" && !previewMode && <button onClick={() => void signOut()} disabled={busy === "sign-out"}>{busy === "sign-out" ? "Signing out…" : "Sign out"}</button>}</div>
      </header>
      {previewMode && <div className={styles.previewLabel} role="status">Fictional preview data · changes are not saved</div>}

      <div className={styles.shell}>
        <aside className={styles.accountRail}>
          <p>My account</p>
          <nav aria-label="Account sections"><span>Orders</span><span>Saved items</span><strong>Fit Passport</strong><span>Settings</span></nav>
          <div className={styles.editorialPanel} aria-hidden="true" />
          <blockquote>Better fits.<br />A more thoughtful<br />wardrobe.</blockquote>
        </aside>

        <section className={styles.content}>
          <div className={styles.titleRow}>
            <div><p className={styles.eyebrow}>Fit Passport</p><h1>The people you shop for.</h1><p>Fit Passport helps MeasureOnce recommend the right size, every time — for everyone in your life.</p></div>
            <button className={styles.addButton} onClick={openAddProfile} disabled={pageState !== "ready"}><Plus aria-hidden="true" /> Add another person</button>
          </div>

          {notice && <div className={`${styles.notice} ${styles[notice.tone]}`} role="status"><span>{notice.tone === "success" ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span><p>{notice.message}</p>{notice.tone === "conflict" && selected && <button onClick={() => void openProfile(selected)}>Reload profile</button>}</div>}

          {pageState === "loading" && <div className={styles.loading} aria-live="polite"><i /><i /><i /><p>Loading your Fit Passport…</p></div>}

          {pageState === "unauthorized" && <StatePanel eyebrow="One MeasureOnce shopping account" title="Sign in to see your Fit Passport." copy="Fit Passport is part of your MeasureOnce shopping account. It does not have a separate login or password." action={<Link href="/account?next=/fit-passport">Sign in to MeasureOnce</Link>} />}

          {pageState === "unavailable" && <StatePanel eyebrow="Temporarily unavailable" title="Fit Passport is temporarily unavailable." copy="The secure profile service is not available right now. Please try again in a moment." action={<button onClick={() => { setPageState("loading"); setNotice(null); void loadProfiles(); }}>Try again</button>} />}

          {pageState === "error" && <StatePanel eyebrow="Something went wrong" title="We couldn’t load your profiles." copy="No changes were made. Check your connection and try once more." action={<button onClick={() => { setPageState("loading"); setNotice(null); void loadProfiles(); }}>Try again</button>} />}

          {pageState === "ready" && profiles.length === 0 && <StatePanel eyebrow="No profiles yet" title="Begin with the person you know best." copy="Create your own profile or add someone you shop for. One familiar garment is enough to begin." action={<button onClick={openAddProfile}><Plus aria-hidden="true" /> Add a person</button>} />}

          {pageState === "ready" && profiles.length > 0 && <div className={styles.profileList}>
            {profiles.map((profile, index) => (
              <article key={profile.id} className={styles.profileCard}>
                <span className={`${styles.avatar} ${index % 2 ? styles.avatarDeep : ""}`}>{initials(profile.nickname)}</span>
                <div className={styles.profileCopy}>
                  <h2>{profile.nickname}{profile.kind === "self" ? " (You)" : ""}</h2>
                  <p className={styles.profileType}><i />{profile.kind === "self" ? "Profile owner" : "Additional member"}</p>
                  <strong>{profile.anchors.length} known {profile.anchors.length === 1 ? "garment" : "garments"}</strong>
                  <small>{anchorSummary(profile)}</small>
                </div>
                <button className={styles.outlineButton} onClick={() => void openProfile(profile)}>{profile.anchors.length ? "View profile" : "Edit profile"}</button>
              </article>
            ))}
          </div>}

          {pageState === "ready" && profiles.length > 0 && <section className={styles.recent}>
            <div><p className={styles.eyebrow}>Recently added garments</p><em>Every familiar garment sharpens your fit</em></div>
            <div className={styles.garmentRail} aria-label="Recently added garment categories">
              {profiles.flatMap((profile) => profile.anchors).slice(0, 3).map((anchor, index) => <article key={anchorKey(anchor, index)}><div className={styles.garmentImage}><Image src={["/products/original/mo-women-001-front.jpg", "/products/original/mo-men-004-front.jpg", "/products/original/mo-women-014-front.jpg"][index]} alt="" fill sizes="(max-width: 720px) 40vw, 12vw" /></div><b>{displayCategory(anchor.category)}</b><small>{anchorBrand(anchor)} · {anchor.sizeLabel}</small></article>)}
              <article className={styles.garmentNote}><b>Your wardrobe,<br />translated.</b><small>Add fit evidence from clothes you already wear.</small></article>
            </div>
          </section>}
        </section>

        <aside className={styles.dataRail}>
          <p className={styles.eyebrow}>Your fit data</p>
          <h2>You stay in control of what MeasureOnce remembers.</h2>
          <div className={styles.rule} />
          <button className={styles.dataAction} onClick={() => void downloadExport()} disabled={busy === "export" || pageState !== "ready"}><span><Download aria-hidden="true" /></span><b>{busy === "export" ? "Preparing…" : "Download your fit data"}</b><small>Get a portable copy at any time.</small></button>
          <button className={styles.dataAction} onClick={() => setConfirmDelete(true)} disabled={pageState !== "ready"}><span><Trash2 aria-hidden="true" /></span><b>Delete Fit Passport</b><small>Your shopping account stays active.</small></button>
          <div className={styles.permissionBox}><b>Fit-data permission</b><p>Choose whether new fit details may be saved.</p><div><button onClick={() => void updateConsent(true)} disabled={Boolean(busy) || pageState !== "ready"}>Allow saving</button><button onClick={() => void updateConsent(false)} disabled={Boolean(busy) || pageState !== "ready"}>Pause</button></div></div>
          <div className={styles.about}><p className={styles.eyebrow}>About MeasureOnce</p><p>Fit data is stored separately from your account credentials and used only to improve shopping recommendations.</p></div>
          <blockquote>People fit differently.<br />That’s a beautiful thing.</blockquote>
        </aside>
      </div>

      {addOpen && <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && setAddOpen(false)}><section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-title"><button className={styles.close} onClick={() => setAddOpen(false)} aria-label="Close"><X aria-hidden="true" /></button><p className={styles.eyebrow}>New fit profile</p><h2 id="add-title">Who are you shopping for?</h2><p className={styles.modalIntro}>Use any name they will recognize. You can add measurements or a known garment after creating the profile.</p><form onSubmit={createProfile}><fieldset className={styles.kindChoice}><legend>Profile for</legend><button type="button" className={newProfileKind === "self" ? styles.kindActive : ""} disabled={hasSelfProfile} onClick={() => setNewProfileKind("self")}>Myself</button><button type="button" className={newProfileKind === "additional_member" ? styles.kindActive : ""} onClick={() => setNewProfileKind("additional_member")}>Someone else</button></fieldset><label>Profile name<input autoFocus required maxLength={40} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={newProfileKind === "self" ? "Your preferred name" : "e.g. Alex"} /></label><label className={styles.collectionField}>Shopping collection<select aria-label="Shopping collection" value={catalogCollection} onChange={(event) => setCatalogCollection(event.target.value as CatalogCollection)}><option value="women">Women</option><option value="men">Men</option><option value="both">Women and men</option></select><small>* Used only to show relevant clothing types and size charts.</small></label><label className={styles.check}><input type="checkbox" checked={storageConsent} onChange={(event) => setStorageConsent(event.target.checked)} /><span><b>Allow Fit Passport storage</b><small>MeasureOnce may save this profile to provide fit recommendations.</small></span></label>{newProfileKind === "additional_member" && <label className={styles.check}><input type="checkbox" checked={permission} onChange={(event) => setPermission(event.target.checked)} /><span><b>I have their permission</b><small>Required before saving another person’s fit details.</small></span></label>}<button className={styles.submit} disabled={!nickname.trim() || !storageConsent || (newProfileKind === "additional_member" && !permission) || busy === "create"}>{busy === "create" ? "Adding…" : "Add profile"}</button></form></section></div>}

      {selected && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) { resetKnownSizeEditor(); setSelected(null); } }}><section className={`${styles.modal} ${styles.profileModal}`} role="dialog" aria-modal="true" aria-labelledby="profile-title"><button className={styles.close} onClick={() => { resetKnownSizeEditor(); setSelected(null); }} aria-label="Close"><X aria-hidden="true" /></button>{detailLoading ? <div className={styles.detailLoading}>Loading profile…</div> : <><p className={styles.eyebrow}>{selected.kind === "self" ? "Your profile" : "Additional member"}</p><h2 id="profile-title">{selected.nickname}</h2><div className={styles.stats}><span><b>{selected.anchors.length}</b><small>Known garments</small></span><span><b>{selected.measurements.length}</b><small>Measurements</small></span><span><b>{selected.preferences.length}</b><small>Preferences</small></span></div><form onSubmit={updateProfile}><label>Profile name<input required maxLength={40} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><section className={styles.measurementEditor} aria-labelledby="measurements-title"><div><p className={styles.eyebrow}>Optional body measurements</p><h3 id="measurements-title">Add only what you know.</h3><p>Used for category-relevant recommendations. Leave a field empty if you do not know it.</p></div><div className={styles.measurementUnit} aria-label="Measurement unit"><span>Unit</span><button type="button" className={measurementUnit === "in" ? styles.unitActive : ""} onClick={() => changeMeasurementUnit("in")}>Inches</button><button type="button" className={measurementUnit === "cm" ? styles.unitActive : ""} onClick={() => changeMeasurementUnit("cm")}>Centimetres</button></div><div className={styles.measurementGrid}>{bodyMeasurementFields.map((field) => <label key={field.region}>{field.label}<small>{field.hint}</small><input inputMode="decimal" value={measurementDraft[field.region] ?? ""} onChange={(event) => setMeasurementDraft((current) => ({ ...current, [field.region]: event.target.value }))} placeholder="Optional" aria-label={`${field.label} in ${measurementUnit === "in" ? "inches" : "centimetres"}`} /></label>)}</div></section><button className={styles.submit} disabled={!nickname.trim() || busy === "update"}>{busy === "update" ? "Saving…" : "Save changes"}</button></form>
        <section className={styles.knownSizeEditor} aria-labelledby="known-size-title"><div className={styles.knownSizeHeading}><div><p className={styles.eyebrow}>Known size</p><h3 id="known-size-title">A size you already know.</h3><p>Verified category charts may support recommendations. Other labels are remembered as context only.</p></div>{!knownSizeOpen && <button type="button" className={styles.knownSizeAdd} onClick={() => setKnownSizeOpen(true)}>Add a known size</button>}</div>
          {knownSizeOpen && <div className={styles.knownSizeForm}>{selected.catalogCollection === "both" && <label>Collection for this garment<select aria-label="Collection for this garment" value={knownSizeCollection} onChange={(event) => { setKnownSizeCollection(event.target.value as KnownSizeCollection); setKnownSizeBrand(""); setKnownSizeCategory(""); setKnownSizeLabel(""); setKnownSizeObservations({}); setKnownSizeReferences([]); }}><option value="">Choose a collection</option><option value="women">Women</option><option value="men">Men</option></select></label>}{activeKnownSizeCollection && <label>Clothing type<select aria-label="Clothing type" value={knownSizeCategory} onChange={(event) => { setKnownSizeCategory(event.target.value as KnownSizeCategory); setKnownSizeBrand(""); setKnownSizeLabel(""); setKnownSizeCustomLabel(""); setKnownSizeObservations({}); setKnownSizeReferences([]); }}><option value="">Choose a clothing type</option>{availableKnownSizeCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>}
            {knownSizeCategory && <label>Brand<select aria-label="Brand" value={knownSizeBrand} onChange={(event) => { setKnownSizeBrand(event.target.value); setKnownSizeLabel(""); setKnownSizeCustomLabel(""); setKnownSizeObservations({}); }}><option value="">Choose a brand</option>{availableKnownSizeBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}<option value="not-listed">Brand not listed</option></select></label>}
            {knownSizeBrand === "not-listed" && <label>Brand name<input aria-label="Brand name" value={knownSizeCustomBrand} onChange={(event) => setKnownSizeCustomBrand(event.target.value)} placeholder="Brand name" /></label>}
            {knownSizeCategory && (availableKnownSizeReferences.length > 0 ? <><label>Size on the label<select aria-label="Size on the label" value={knownSizeLabel} onChange={(event) => { setKnownSizeLabel(event.target.value); setKnownSizeCustomLabel(""); setKnownSizeObservations({}); }}><option value="">Choose a size</option>{availableKnownSizeReferences.map((reference) => <option key={reference.id} value={reference.sizeLabel}>{reference.sizeLabel}</option>)}<option value="not-listed">Size not listed</option></select></label>{knownSizeLabel === "not-listed" && <label>Enter size on the label<input aria-label="Enter size on the label" value={knownSizeCustomLabel} onChange={(event) => setKnownSizeCustomLabel(event.target.value)} placeholder="e.g. 12" /></label>}</> : <label>Size on the label<input aria-label="Size on the label" value={knownSizeLabel} onChange={(event) => setKnownSizeLabel(event.target.value)} placeholder="e.g. M or 8" /></label>)}
            {knownSizeCategory && knownSizeLabelValue && <><p className={`${styles.evidenceStatus} ${selectedKnownSizeReference ? styles.verified : styles.contextOnly}`}>{selectedKnownSizeReference ? "Verified category size data" : "Saved as context — not used alone for recommendations"}</p><div className={styles.observationGrid}>{knownSizeRegions.map((region) => <fieldset key={region}><legend>{knownSizeFields[region].label} fit</legend><div>{(knownSizeFields[region].isLength ? [["too_short", "Too short"], ["right_length", "Just right"], ["too_long", "Too long"]] : [["too_tight", "Too tight"], ["just_right", "Just right"], ["too_loose", "Too loose"]]).map(([value, label]) => <button key={value} type="button" className={knownSizeObservations[region] === value ? styles.observationActive : ""} onClick={() => setKnownSizeObservations((current) => ({ ...current, [region]: value }))}>{label}</button>)}</div></fieldset>)}</div><div className={styles.knownSizeActions}><button type="button" onClick={resetKnownSizeEditor}>Cancel</button><button type="button" onClick={() => void saveKnownSize()} disabled={busy === "known-size" || !knownSizeBrandName}>{busy === "known-size" ? "Saving…" : "Save known size"}</button></div></>}</div>}
        </section>
        <section className={styles.savedEvidence} aria-labelledby="saved-evidence-title"><p className={styles.eyebrow}>Saved evidence</p><h3 id="saved-evidence-title">What this profile remembers.</h3>{selected.anchors.length ? <div>{selected.anchors.map((anchor, index) => <article key={anchorKey(anchor, index)}><div><b>{anchorBrand(anchor)} · {displayCategory(anchor.category)} · {anchor.sizeLabel}</b><small>{anchorStatus(anchor)}</small><p>{Object.entries(anchor.observations).map(([region, observation]) => `${knownSizeFields[region as KnownSizeRegion]?.label ?? region}: ${observation.replaceAll("_", " ")}`).join(" · ") || "No fit notes added."}</p></div><button type="button" onClick={() => void removeAnchor(index)} disabled={busy === `remove-anchor:${index}`}>{busy === `remove-anchor:${index}` ? "Removing…" : "Remove"}</button></article>)}</div> : <p className={styles.emptyEvidence}>No fit evidence saved yet.</p>}</section>
        <button className={styles.deleteProfile} onClick={() => void deleteProfile()} disabled={busy === "delete-profile"}>{busy === "delete-profile" ? "Removing…" : "Remove this fit profile"}</button></>}</section></div>}

      {confirmDelete && <div className={styles.overlay}><section className={styles.modal} role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><button className={styles.close} onClick={() => setConfirmDelete(false)} aria-label="Close"><X aria-hidden="true" /></button><p className={styles.eyebrow}>Privacy control</p><h2 id="delete-title">Delete your Fit Passport?</h2><p className={styles.modalIntro}>This removes every fit profile, measurement, preference and known garment. Your MeasureOnce shopping account remains active.</p><div className={styles.confirmActions}><button onClick={() => setConfirmDelete(false)}>Keep Fit Passport</button><button onClick={() => void deleteFitPassport()} disabled={busy === "delete-account"}>{busy === "delete-account" ? "Deleting…" : "Delete fit data"}</button></div></section></div>}
    </main>
  );
}

function StatePanel({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action: React.ReactNode }) {
  return <section className={styles.statePanel}><p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2><p>{copy}</p>{action}</section>;
}


