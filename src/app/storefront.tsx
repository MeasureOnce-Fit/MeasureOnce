"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { catalog, catalogCounts, menCategories, Product, womenCategories, type Gender } from "@/lib/catalog";
import { buildKnownGarmentObservations, formatFitFindingReason, formatFitRegion, knownGarmentAreaKeys } from "@/lib/fit/known-garment-ui";
import { categoryNoun, categorySizeLabel, categorySizeObservations } from "@/lib/fit/category-size-reference-ui";
import { buildManualGarmentRequest, manualGarmentFields } from "@/lib/fit/manual-garment-ui";
import { savedFitEvidenceDescription } from "@/lib/fit/saved-profile-ui";
import type { ManualGarmentRequirement } from "@/lib/fit/manual-garment";
import type { CategorySizeReferenceSummary, MeasurementRegion } from "@/lib/fit/types";
import type { FitProfile } from "@/lib/identity/types";
import { M4LandingSections } from "./m4-review/landing-review";
import { ApprovedWelcome, StorefrontHeader } from "./approved-landing";

const fitQuestions = ["Entry", "Basics", "Fit anchor", "Preferences", "Your match"];
const fitAreas = [
  { key: "waist", label: "Waist", options: ["Too tight", "Just right", "Too loose", "Not applicable"] },
  { key: "hip", label: "Hip / seat", options: ["Too tight", "Just right", "Too loose", "Not applicable"] },
  { key: "chest", label: "Chest / bust", options: ["Too tight", "Just right", "Too loose", "Not applicable"] },
  { key: "shoulder", label: "Shoulders", options: ["Too narrow", "Just right", "Too wide", "Not applicable"] },
  { key: "length", label: "Body length", options: ["Too short", "Perfect", "Too long", "Not applicable"] },
  { key: "sleeve", label: "Sleeve length", options: ["Too short", "Perfect", "Too long", "Not applicable"] },
  { key: "neck", label: "Neck", options: ["Too tight", "Just right", "Too loose", "Not applicable"] },
  { key: "inseam", label: "Inseam", options: ["Too short", "Perfect", "Too long", "Not applicable"] },
] as const;

type FitAreaKey = (typeof fitAreas)[number]["key"];
type FitFeedback = Record<FitAreaKey, string>;
type CartItem = { productId: string; size: string; quantity: number };
type CheckoutStep = "bag" | "delivery" | "payment" | "confirmed";
type BodyMeasurementRegion = MeasurementRegion;
type EvidencePath = "body" | "known" | "exact" | "manual" | "unmeasured" | "remembered" | "saved";
type ProductFitResult = {
  state: "RECOMMENDED" | "TRADEOFF" | "INSUFFICIENT_PROFILE_EVIDENCE" | "INSUFFICIENT_GARMENT_EVIDENCE" | "CONFLICTING_EVIDENCE" | "NO_SUITABLE_SIZE" | "UNSUPPORTED";
  recommendedSizeLabel?: string;
  alternateSizeLabel?: string;
  findings: Array<{ region: BodyMeasurementRegion; assessment: string; reason: string }>;
  options?: Array<{ sizeLabel: string; findings: Array<{ region: BodyMeasurementRegion; assessment: string; reason: string }> }>;
  evidence?: { missingRegions: BodyMeasurementRegion[]; used?: Array<"body_measurement" | "reference_garment" | "manual_reference_garment"> };
  nextSteps: string[];
};

type BodyMeasurementField = { region: BodyMeasurementRegion; label: string; hint: string };
type CategorySizeBrand = { brandId: string; brandName: string; category: string; hasVerifiedReference: boolean };
type KnownAnchorOption = { id: string; label: string; productName: string; brandName: string; category: string; regions: BodyMeasurementRegion[] };

function referenceGarmentType(product: Product) {
  const name = product.name.toLowerCase();
  if (name.includes("jean")) return "Jeans";
  if (name.includes("dress")) return "Dress";
  if (name.includes("skirt")) return "Skirt";
  if (name.includes("shorts")) return "Shorts";
  if (name.includes("trouser")) return "Trousers";
  if (name.includes("waistcoat")) return "Waistcoat";
  if (/jacket|coat|trench|peacoat|blouson|parka/.test(name)) return "Jacket";
  if (/shirt|tee|top|tunic|shell|polo|overshirt/.test(name)) return "Shirt / top";
  if (/sweater|cardigan|knit|vest/.test(name)) return "Knitwear";
  if (/sweatshirt|hoodie/.test(name)) return "Sweatshirt";
  return product.category;
}

function bodyMeasurementFields(product: Product): BodyMeasurementField[] {
  const type = referenceGarmentType(product);
  if (["Trousers", "Jeans", "Shorts"].includes(type)) {
    return [
      { region: "waist", label: "Waist", hint: "Where this waistband sits" },
      { region: "hip_seat", label: "Hip / seat", hint: "Around the fullest point" },
      { region: "inseam", label: "Inseam", hint: "Crotch seam to ankle" },
    ];
  }
  if (type === "Skirt") return [
    { region: "waist", label: "Waist", hint: "Where this waistband sits" },
    { region: "hip_seat", label: "Hip", hint: "Around the fullest point" },
  ];
  if (type === "Dress") return [
    { region: "chest_bust", label: "Chest / bust", hint: "Around the fullest point" },
    { region: "waist", label: "Waist", hint: "At the natural waist" },
    { region: "hip_seat", label: "Hip", hint: "Around the fullest point" },
  ];
  if (type === "Jacket" || type === "Waistcoat") return [
    { region: "chest_bust", label: "Chest / bust", hint: "Around the fullest point" },
    { region: "shoulder_cross_back", label: "Shoulder width", hint: "Across the back shoulders" },
    { region: "body_length", label: "Body length", hint: "Shoulder to desired hem" },
    ...(type === "Jacket" ? [{ region: "sleeve_length" as const, label: "Sleeve length", hint: "Shoulder seam to wrist" }] : []),
  ];
  if (type === "Shirt / top") return [
    { region: "chest_bust", label: "Chest / bust", hint: "Around the fullest point" },
    { region: "neck", label: "Neck", hint: "Around the base of the neck" },
    { region: "shoulder_cross_back", label: "Shoulder width", hint: "Across the back shoulders" },
    { region: "body_length", label: "Body length", hint: "Shoulder to desired hem" },
    { region: "sleeve_length", label: "Sleeve length", hint: "Shoulder seam to wrist" },
  ];
  return [
    { region: "chest_bust", label: "Chest / bust", hint: "Around the fullest point" },
    { region: "shoulder_cross_back", label: "Shoulder width", hint: "Across the back shoulders" },
    { region: "body_length", label: "Body length", hint: "Shoulder to desired hem" },
    { region: "sleeve_length", label: "Sleeve length", hint: "Shoulder seam to wrist" },
  ];
}

const defaultFeedback: FitFeedback = { waist: "", hip: "", chest: "", shoulder: "", length: "", sleeve: "", neck: "", inseam: "" };

function feedbackForGarmentType(garmentType: string): FitFeedback {
  const applicableByType: Record<string, FitAreaKey[]> = {
    Trousers: ["waist", "hip", "inseam"],
    Jeans: ["waist", "hip", "inseam"],
    Shorts: ["waist", "hip", "inseam"],
    Skirt: ["waist", "hip", "length"],
    Jacket: ["chest", "shoulder", "length", "sleeve"],
    "Shirt / top": ["chest", "shoulder", "length", "sleeve", "neck"],
    Knitwear: ["chest", "shoulder", "length", "sleeve"],
    Sweatshirt: ["chest", "shoulder", "length", "sleeve"],
    Waistcoat: ["chest", "shoulder", "length"],
    Dress: ["waist", "hip", "chest", "shoulder", "length", "sleeve"],
  };
  const applicable = new Set(applicableByType[garmentType] ?? fitAreas.map((area) => area.key));
  return Object.fromEntries(fitAreas.map((area) => [area.key, applicable.has(area.key) ? defaultFeedback[area.key] : "Not applicable"])) as FitFeedback;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

function ProductArtwork({ product, detail = false, image }: { product: Product; detail?: boolean; image?: string }) {
  return <Image className="product-art product-photo" src={image ?? product.image} alt={`${product.name}${image && image !== product.image ? " alternate view" : ""}`} width={800} height={1000} sizes={detail ? "(max-width: 720px) 100vw, 45vw" : "(max-width: 720px) 50vw, 30vw"} unoptimized />;
}

export default function Storefront({ view = "home", initialGender = "Women" }: { view?: "home" | "shop" | "about"; initialGender?: Gender }) {
  const router = useRouter();
  const gender = initialGender;
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(24);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [fitOpen, setFitOpen] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<FitProfile[]>([]);
  const [profileSession, setProfileSession] = useState<"loading" | "ready" | "signed-out" | "unavailable">("loading");
  const [activeProfileId, setActiveProfileId] = useState("");
  const [fitStep, setFitStep] = useState(0);
  const [anchorBrand, setAnchorBrand] = useState("");
  const [anchorSize, setAnchorSize] = useState("");
  const [anchorCategory, setAnchorCategory] = useState("Trousers");
  const [fitPreference, setFitPreference] = useState("Balanced");
  const [shoppingFor, setShoppingFor] = useState("Myself");
  const [fitFeedback, setFitFeedback] = useState<FitFeedback>(defaultFeedback);
  const [bodyUnit, setBodyUnit] = useState<"cm" | "in">("in");
  const [evidencePath, setEvidencePath] = useState<EvidencePath>("body");
  const [bodyMeasurements, setBodyMeasurements] = useState<Partial<Record<BodyMeasurementRegion, string>>>({});
  const [categorySizeBrands, setCategorySizeBrands] = useState<CategorySizeBrand[]>([]);
  const [categorySizeOptions, setCategorySizeOptions] = useState<CategorySizeReferenceSummary[]>([]);
  const [categorySizeBrandId, setCategorySizeBrandId] = useState("");
  const [categorySizeReferenceId, setCategorySizeReferenceId] = useState("");
  const [categorySizeStatus, setCategorySizeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [exactSearch, setExactSearch] = useState("");
  const [exactAnchors, setExactAnchors] = useState<KnownAnchorOption[]>([]);
  const [exactAnchorId, setExactAnchorId] = useState("");
  const [exactStatus, setExactStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [manualRequirements, setManualRequirements] = useState<ManualGarmentRequirement[]>([]);
  const [manualRequirementStatus, setManualRequirementStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [manualUnit, setManualUnit] = useState<"cm" | "in">("cm");
  const [manualValues, setManualValues] = useState<Partial<Record<MeasurementRegion, string>>>({});
  const [manualObservations, setManualObservations] = useState<Partial<Record<MeasurementRegion, string>>>({});
  const [manualBrand, setManualBrand] = useState("");
  const [manualProduct, setManualProduct] = useState("");
  const [manualLabelSize, setManualLabelSize] = useState("");
  const [unmeasuredBrand, setUnmeasuredBrand] = useState("");
  const [unmeasuredLabelSize, setUnmeasuredLabelSize] = useState("");
  const [unmeasuredObservations, setUnmeasuredObservations] = useState<Partial<Record<MeasurementRegion, string>>>({});
  const [productFitResult, setProductFitResult] = useState<ProductFitResult | null>(null);
  const [productFitStatus, setProductFitStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [savedFitPreview, setSavedFitPreview] = useState<{ productId: string; result: ProductFitResult | null; status: "idle" | "loading" | "ready" | "error" }>({ productId: "", result: null, status: "idle" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("bag");
  const [orderNumber, setOrderNumber] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const categorySizeRequestRef = useRef(0);
  const productFitRequestRef = useRef(0);
  const savedFitPreviewRequestRef = useRef(0);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const categories = gender === "Women" ? womenCategories : menCategories;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((product) => product.gender === gender && (category === "All" || product.category === category) && (!q || `${product.name} ${product.brand} ${product.category} ${product.colorName}`.toLowerCase().includes(q)));
  }, [gender, category, query]);
  const cartDetails = useMemo(() => cart.map((item) => ({ ...item, product: catalog.find((product) => product.id === item.productId)! })).filter((item) => item.product), [cart]);
  const bagCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartDetails.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const feedbackSummary = fitAreas.filter((area) => fitFeedback[area.key] && fitFeedback[area.key] !== "Not applicable").map((area) => `${area.label} ${fitFeedback[area.key].toLowerCase()}`).join(" · ");
  const fitAnswersComplete = fitAreas.every((area) => Boolean(fitFeedback[area.key]));
  const selectedCategorySizeReference = categorySizeOptions.find((option) => option.id === categorySizeReferenceId) ?? null;
  const selectedCategorySizeBrand = categorySizeBrands.find((brand) => brand.brandId === categorySizeBrandId) ?? null;
  const usesRememberedCategoryBrand = categorySizeBrandId === "__not_listed__" || selectedCategorySizeBrand?.hasVerifiedReference === false;
  const categorySizeRegions = selectedCategorySizeReference?.supportedRegions ?? [];
  const supportedKnownAreas = knownGarmentAreaKeys(categorySizeRegions);
  const knownFitAreas = fitAreas.filter((area) => supportedKnownAreas.includes(area.key));
  const knownAnswersComplete = knownFitAreas.length > 0 && knownFitAreas.every((area) => Boolean(fitFeedback[area.key]) && fitFeedback[area.key] !== "Not applicable");
  const rememberedFitAreas = selected ? fitAreas.filter((area) => knownGarmentAreaKeys(bodyMeasurementFields(selected).map((field) => field.region)).includes(area.key)) : [];
  const rememberedAnswersComplete = rememberedFitAreas.length > 0 && rememberedFitAreas.every((area) => Boolean(fitFeedback[area.key]) && fitFeedback[area.key] !== "Not applicable");
  const selectedExactAnchor = exactAnchors.find((anchor) => anchor.id === exactAnchorId) ?? null;
  const exactFitAreas = fitAreas.filter((area) => knownGarmentAreaKeys(selectedExactAnchor?.regions ?? []).includes(area.key));
  const exactAnswersComplete = exactFitAreas.length > 0 && exactFitAreas.every((area) => Boolean(fitFeedback[area.key]) && fitFeedback[area.key] !== "Not applicable");
  const manualFields = manualGarmentFields(manualRequirements);
  const manualRequest = selected ? buildManualGarmentRequest({
    targetProductId: selected.id,
    preference: fitPreference === "Close" ? "closer" : fitPreference === "Relaxed" ? "relaxed" : "regular",
    unit: manualUnit,
    brandText: manualBrand,
    productText: manualProduct,
    labelSize: manualLabelSize,
    values: manualValues,
    observations: manualObservations,
    requirements: manualRequirements,
  }) : null;
  const targetMeasurementFields = selected ? bodyMeasurementFields(selected) : [];
  const bodyEvidenceComplete = targetMeasurementFields.length > 0 && targetMeasurementFields.every((field) => {
    const value = Number(bodyMeasurements[field.region]);
    return Number.isFinite(value) && value > 0;
  });
  const signedIn = profileSession === "ready";
  const activeProfile = savedProfiles.find((profile) => profile.id === activeProfileId) ?? null;
  const shopperName = activeProfile?.nickname ?? "Jane Doe";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedCart = localStorage.getItem("measureonce-cart");
        if (savedCart) setCart(JSON.parse(savedCart) as CartItem[]);
      } catch { /* Ignore invalid local data. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem("measureonce-cart", JSON.stringify(cart)); }, [cart, hydrated]);

  useEffect(() => {
    let current = true;
    async function loadSavedProfiles() {
      try {
        const response = await fetch("/api/profiles", { cache: "no-store" });
        if (!current) return;
        if (response.status === 401) {
          setSavedProfiles([]);
          setProfileSession("signed-out");
          return;
        }
        if (!response.ok) {
          setSavedProfiles([]);
          setProfileSession("unavailable");
          return;
        }
        const payload = await response.json() as { profiles?: FitProfile[] };
        const profiles = payload.profiles ?? [];
        setSavedProfiles(profiles);
        setActiveProfileId((previous) => previous || profiles.find((profile) => profile.kind === "self")?.id || profiles[0]?.id || "");
        setProfileSession("ready");
      } catch {
        if (current) setProfileSession("unavailable");
      }
    }
    void loadSavedProfiles();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    const requestId = ++savedFitPreviewRequestRef.current;
    if (!selected || !activeProfile || profileSession !== "ready") return;

    const controller = new AbortController();
    void fetch("/api/fit/saved-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ targetProductId: selected.id, preference: "regular", profileId: activeProfile.id }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Saved fit preview unavailable.");
      const payload = await response.json() as { result?: ProductFitResult };
      if (!payload.result) throw new Error("Saved fit preview unavailable.");
      if (requestId !== savedFitPreviewRequestRef.current) return;
      setSavedFitPreview({ productId: selected.id, result: payload.result, status: "ready" });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId !== savedFitPreviewRequestRef.current) return;
      setSavedFitPreview({ productId: selected.id, result: null, status: "error" });
    });
    return () => controller.abort();
  }, [activeProfile, profileSession, selected]);

  useEffect(() => {
    if (!selected || evidencePath !== "known") return;
    const controller = new AbortController();
    fetch(`/api/fit/category-size-reference?targetProductId=${encodeURIComponent(selected.id)}&view=brands`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Category size brands unavailable.");
        const payload = await response.json() as { brands?: CategorySizeBrand[] };
        setCategorySizeBrands(payload.brands ?? []);
        setCategorySizeStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCategorySizeBrands([]);
        setCategorySizeStatus("error");
      });
    return () => controller.abort();
  }, [evidencePath, selected]);

  useEffect(() => {
    if (view === "shop" && new URLSearchParams(window.location.search).has("search")) {
      document.querySelector<HTMLInputElement>(".search-box input")?.focus();
    }
  }, [view]);

  useEffect(() => {
    if (!selected || (evidencePath !== "manual" && evidencePath !== "unmeasured")) return;
    const controller = new AbortController();
    fetch(`/api/fit/manual-garment?targetProductId=${encodeURIComponent(selected.id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Manual garment requirements unavailable.");
        const payload = await response.json() as { requirements?: ManualGarmentRequirement[] };
        setManualRequirements(payload.requirements ?? []);
        setManualRequirementStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setManualRequirements([]);
        setManualRequirementStatus("error");
      });
    return () => controller.abort();
  }, [evidencePath, selected]);

  useLayoutEffect(() => {
    if (!fitOpen) return;
    if (fitStep === 2 && evidencePath === "remembered") {
      const restoreRemembered = window.setTimeout(() => {
        setEvidencePath("known");
      }, 0);
      return () => window.clearTimeout(restoreRemembered);
    }
    const panel = document.querySelector<HTMLElement>(".fit-panel");
    const overlay = document.querySelector<HTMLElement>(".fit-overlay");
    panel?.scrollTo({ top: 0 });
    if (panel && overlay && window.matchMedia("(max-width: 720px)").matches) overlay.scrollTo({ top: panel.offsetTop });
    if (fitStep === 4 && (evidencePath === "unmeasured" || evidencePath === "remembered" || productFitStatus === "ready" || productFitStatus === "error")) resultHeadingRef.current?.focus({ preventScroll: true });
  }, [evidencePath, fitOpen, fitStep, productFitStatus]);

  function openProduct(product: Product) { setSelected(product); setSelectedAngle(0); setSelectedSize(""); }
  async function loadCategorySizeOptions(product: Product, brandId: string) {
    const requestId = ++categorySizeRequestRef.current;
    setCategorySizeStatus("loading");
    setCategorySizeReferenceId("");
    try {
      const response = await fetch(`/api/fit/category-size-reference?targetProductId=${encodeURIComponent(product.id)}&view=sizes&brandId=${encodeURIComponent(brandId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Category size options unavailable.");
      const payload = await response.json() as { sizes?: CategorySizeReferenceSummary[] };
      if (requestId !== categorySizeRequestRef.current) return;
      setCategorySizeOptions(payload.sizes ?? []);
      setCategorySizeStatus("ready");
    } catch {
      if (requestId !== categorySizeRequestRef.current) return;
      setCategorySizeOptions([]);
      setCategorySizeStatus("error");
    }
  }
  function selectCategorySizeReference(referenceId: string) {
    setCategorySizeReferenceId(referenceId);
    const reference = categorySizeOptions.find((candidate) => candidate.id === referenceId);
    setAnchorBrand(reference?.brandName ?? "");
    const supported = new Set(knownGarmentAreaKeys(reference?.supportedRegions ?? []));
    setFitFeedback(Object.fromEntries(fitAreas.map((area) => [area.key, supported.has(area.key) ? "" : "Not applicable"])) as FitFeedback);
  }
  async function loadExactAnchors(product: Product, query: string) {
    if (query.trim().length < 2) return;
    setExactStatus("loading");
    try {
      const response = await fetch(`/api/fit/known-garment?targetProductId=${encodeURIComponent(product.id)}&query=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Exact garment search failed.");
      const payload = await response.json() as { anchors?: KnownAnchorOption[] };
      setExactAnchors(payload.anchors ?? []);
      setExactStatus("ready");
    } catch {
      setExactAnchors([]);
      setExactStatus("error");
    }
  }
  function selectExactAnchor(anchorId: string) {
    setExactAnchorId(anchorId);
    const anchor = exactAnchors.find((candidate) => candidate.id === anchorId);
    const supported = new Set(knownGarmentAreaKeys(anchor?.regions ?? []));
    setFitFeedback(Object.fromEntries(fitAreas.map((area) => [area.key, supported.has(area.key) ? "" : "Not applicable"])) as FitFeedback);
  }
  function openFit(product?: Product) {
    productFitRequestRef.current += 1;
    if (product) {
      openProduct(product);
      const garmentType = referenceGarmentType(product);
      setAnchorCategory(garmentType);
      setFitFeedback(feedbackForGarmentType(garmentType));
      setBodyMeasurements({});
      setEvidencePath("body");
      setCategorySizeBrands([]);
      setCategorySizeOptions([]);
      setCategorySizeBrandId("");
      setCategorySizeReferenceId("");
      categorySizeRequestRef.current += 1;
      setCategorySizeStatus("idle");
      setExactSearch("");
      setExactAnchors([]);
      setExactAnchorId("");
      setExactStatus("idle");
      setManualRequirements([]);
      setManualRequirementStatus("idle");
      setManualValues({});
      setManualObservations({});
      setManualBrand("");
      setManualProduct("");
      setManualLabelSize("");
      setUnmeasuredBrand("");
      setUnmeasuredLabelSize("");
      setUnmeasuredObservations({});
      setProductFitResult(null);
      setProductFitStatus("idle");
    }
    setFitStep(0);
    setFitOpen(true);
  }
  function closeFit() {
    productFitRequestRef.current += 1;
    setFitOpen(false);
  }
  async function showSessionResult() {
    const requestId = ++productFitRequestRef.current;
    setFitStep(4);
    if (evidencePath === "remembered") {
      setProductFitResult(null);
      setProductFitStatus("idle");
      return;
    }
    const useKnownAnchor = evidencePath === "known";
    const useExactAnchor = evidencePath === "exact";
    const useManualGarment = evidencePath === "manual";
    const useSavedProfile = evidencePath === "saved";
    if (!selected || (!useSavedProfile && !useKnownAnchor && !useExactAnchor && !useManualGarment && !bodyEvidenceComplete) || (useKnownAnchor && (!categorySizeReferenceId || !knownAnswersComplete)) || (useExactAnchor && (!exactAnchorId || !exactAnswersComplete)) || (useManualGarment && !manualRequest) || (useSavedProfile && !activeProfile)) {
      setProductFitResult(null);
      setProductFitStatus("idle");
      return;
    }
    setProductFitStatus("loading");
    setProductFitResult(null);
    try {
      const response = await fetch(useSavedProfile ? "/api/fit/saved-profile" : useKnownAnchor ? "/api/fit/category-size-reference" : useExactAnchor ? "/api/fit/known-garment" : useManualGarment ? "/api/fit/manual-garment" : "/api/fit/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useSavedProfile ? {
          targetProductId: selected.id,
          preference: fitPreference === "Close" ? "closer" : fitPreference === "Relaxed" ? "relaxed" : "regular",
          profileId: activeProfileId,
        } : useKnownAnchor ? {
          targetProductId: selected.id,
          preference: fitPreference === "Close" ? "closer" : fitPreference === "Relaxed" ? "relaxed" : "regular",
          referenceId: categorySizeReferenceId,
          observations: categorySizeObservations(fitFeedback, categorySizeRegions),
        } : useExactAnchor ? {
          targetProductId: selected.id,
          preference: fitPreference === "Close" ? "closer" : fitPreference === "Relaxed" ? "relaxed" : "regular",
          anchorVariantId: exactAnchorId,
          observations: buildKnownGarmentObservations(fitFeedback, selectedExactAnchor?.regions ?? []),
        } : useManualGarment ? manualRequest : {
          targetProductId: selected.id,
          preference: fitPreference === "Close" ? "closer" : fitPreference === "Relaxed" ? "relaxed" : "regular",
          measurements: targetMeasurementFields.map((field) => ({ region: field.region, value: Number(bodyMeasurements[field.region]), unit: bodyUnit })),
        }),
      });
      if (!response.ok) throw new Error("Product fit recommendation failed.");
      const payload = await response.json() as { result?: ProductFitResult };
      if (!payload.result) throw new Error("Product fit recommendation was unavailable.");
      if (requestId !== productFitRequestRef.current) return;
      setProductFitResult(payload.result);
      setProductFitStatus("ready");
    } catch {
      if (requestId !== productFitRequestRef.current) return;
      setProductFitStatus("error");
    }
  }
  function addToBag(product: Product, size: string) {
    setCart((current) => {
      const match = current.find((item) => item.productId === product.id && item.size === size);
      return match ? current.map((item) => item === match ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { productId: product.id, size, quantity: 1 }];
    });
    setSelected(null); closeFit(); setCheckoutStep("bag"); setCheckoutOpen(true);
  }
  function removeFromBag(productId: string, size: string) { setCart((current) => current.filter((item) => !(item.productId === productId && item.size === size))); }
  function updateQuantity(productId: string, size: string, quantity: number) { if (quantity < 1) return removeFromBag(productId, size); setCart((current) => current.map((item) => item.productId === productId && item.size === size ? { ...item, quantity } : item)); }
  function placeOrder() { setOrderNumber(`MO-${String(Date.now()).slice(-7)}`); setCart([]); setCheckoutStep("confirmed"); }

  return <main id="top">
    <StorefrontHeader
      activePage={view === "shop" ? gender : view}
      onFit={() => router.push(signedIn ? "/fit-passport" : "/account?next=/fit-passport")}
      onCart={() => { setCheckoutStep("bag"); setCheckoutOpen(true); }}
      onSearch={() => { if (view === "shop") document.querySelector<HTMLInputElement>(".search-box input")?.focus(); else router.push("/shop/women?search=1"); }}
      bagCount={bagCount}
      accountName={signedIn ? savedProfiles.find((profile) => profile.kind === "self")?.nickname ?? activeProfile?.nickname ?? "My account" : undefined}
    />
    {view === "home" && <ApprovedWelcome shopperName={signedIn ? savedProfiles.find((profile) => profile.kind === "self")?.nickname : undefined} onBrowse={() => router.push("/shop/women")} onSetup={() => router.push(signedIn ? "/fit-passport" : "/account?next=/fit-passport")} />}
    {view === "about" && <>
      <section className="about-introduction"><p className="eyebrow">About MeasureOnce</p><h1>A little less guessing.<br />A fit you can understand.</h1><p>Save what fits, compare it across brands, and see why a size is suggested. Fit Passport lives inside your shopping account, ready when you need it.</p><nav aria-label="About sections"><a href="#preview">Try the fit demo</a><a href="#fit">How it works</a><a href="#evidence">Evaluation</a><a href="#faqs">FAQs</a></nav></section>
      <M4LandingSections showWelcome={false} onBrowseShop={() => router.push("/shop/women")} onOpenFitPassport={() => router.push(signedIn ? "/fit-passport" : "/account?next=/fit-passport")} />
    </>}

    {view === "shop" && <section className="shop-section" id="shop">
      <div className="section-heading"><div><p className="eyebrow">The measured collection</p><h1>Shop {gender}</h1></div><p>{gender === "Men" ? "Everyday pieces. A style that’s yours." : "Your wardrobe. Your way."}</p></div>
      <div className="catalog-controls"><div className="gender-switch">{(["Women", "Men"] as Gender[]).map((item) => <Link key={item} href={`/shop/${item.toLowerCase()}`} className={gender === item ? "active" : ""} aria-current={gender === item ? "page" : undefined}>{item} <sup>{catalogCounts[item]}</sup></Link>)}</div><label className="search-box"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Brand, style, color…" /></label></div>
      <div className="category-rail">{["All", ...categories].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => { setCategory(item); setVisibleCount(24); }}>{item}</button>)}</div>
      <div className="catalog-meta"><span>{filtered.length} pieces</span><span>Sorted by measured relevance ↓</span></div>
      <div className="product-grid">{filtered.slice(0, visibleCount).map((product, index) => <article className={`product-card ${index % 11 === 0 ? "featured" : ""}`} key={product.id}><button className="product-image-button" onClick={() => openProduct(product)}><ProductArtwork product={product} /><span className="fit-ready">Fit-ready</span><span className="quick-view">View {product.images.length} garment views</span></button><div className="product-info"><div><span>{product.brand}</span><h3>{product.name}</h3></div><strong>${product.price}</strong></div><div className="product-subline"><span>{product.colorName} · {product.fit} fit</span><button onClick={() => openFit(product)}>Find my size</button></div></article>)}</div>
      {visibleCount < filtered.length && <button className="load-button" onClick={() => setVisibleCount((count) => count + 24)}>Load more styles <span>{Math.min(24, filtered.length - visibleCount)}</span></button>}
    </section>}

    <footer><Link className="wordmark" href="/">MEASURE<span>ONCE</span></Link><nav aria-label="Footer navigation"><Link href="/shop/women">Shop Women</Link><Link href="/shop/men">Shop Men</Link><Link href="/about">About</Link><Link href="/fit-passport">My Fit</Link></nav><span>© 2026 MeasureOnce</span></footer>

    {selected && !fitOpen && <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section className="product-drawer" role="dialog" aria-modal="true" aria-label={`${selected.name} details`}><button className="close-button" onClick={() => setSelected(null)}>×</button><div className="drawer-gallery"><div className="drawer-art"><ProductArtwork product={selected} image={selected.images[selectedAngle]} detail /></div><div className="angle-picker" aria-label="Garment views">{selected.images.map((image, index) => <button key={image} className={selectedAngle === index ? "active" : ""} onClick={() => setSelectedAngle(index)} aria-label={selected.viewLabels[index]} aria-pressed={selectedAngle === index}><ProductArtwork product={selected} image={image} /><span>{selected.viewLabels[index]}</span></button>)}</div></div><div className="drawer-content"><p className="eyebrow">{selected.brand} · {selected.category}</p><h2>{selected.name}</h2><div className="price-line"><strong>${selected.price}</strong><span>{selected.colorName}</span></div><p>{selected.description}</p><div className="fingerprint-mini"><div><span>FIT</span><strong>{selected.fit}</strong></div><div><span>STRETCH</span><strong>{selected.stretch}</strong></div><div><span>FIT DATA</span><strong>Available</strong></div></div>{savedFitPreview.productId === selected.id && savedFitPreview.status === "loading" && <p className="privacy-note" role="status">Checking {activeProfile?.nickname ?? "your"}&apos;s saved fit…</p>}{savedFitPreview.productId === selected.id && savedFitPreview.status === "ready" && savedFitPreview.result?.state === "RECOMMENDED" && savedFitPreview.result.recommendedSizeLabel && <section className="saved-fit-preview" aria-label="Saved fit recommendation"><small>YOUR SAVED FIT</small><strong>Try {savedFitPreview.result.recommendedSizeLabel}</strong><p>Based on {savedFitEvidenceDescription(savedFitPreview.result.evidence?.used ?? [])} for {activeProfile?.nickname ?? "your profile"}.</p></section>}{savedFitPreview.productId === selected.id && savedFitPreview.status === "ready" && savedFitPreview.result && savedFitPreview.result.state !== "RECOMMENDED" && <section className="saved-fit-preview"><small>YOUR SAVED FIT</small><p>Saved evidence needs one more detail for this item.</p></section>}<div className="measurement-list">{selected.measurements.map((measurement) => <span key={measurement.label}>{measurement.label.replace(" (demo)", "")}<b>{measurement.value}</b></span>)}</div><button className="fit-cta" onClick={() => openFit(selected)}><span><small>MEASUREONCE</small>Find my best fit</span><ArrowIcon /></button><div className="quick-purchase"><label>Or select a size<select value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}><option value="">Choose size</option>{selected.sizes.map((size) => <option key={size}>{size}</option>)}</select></label><button disabled={!selectedSize} onClick={() => addToBag(selected, selectedSize)}>Add to bag</button></div><small className="privacy-note">Fit guidance is an estimate. Product photography: original MeasureOnce Studio concept.</small></div></section></div>}

    {fitOpen && <div className="fit-overlay" role="dialog" aria-modal="true" aria-label="Fit questionnaire"><button className="close-button light" onClick={closeFit}>×</button><aside className="fit-aside"><a className="wordmark light-mark" href="#top">MEASURE<span>ONCE</span></a><div><p className="eyebrow">Fit translation</p><h2>{selected ? selected.name : "Your Fit Passport"}</h2><p>{selected ? `${selected.brand} · ${selected.fit} ${selected.category.toLowerCase()}` : "A portable fit profile built from clothes you already know."}</p></div>{selected && <ProductArtwork product={selected} />}<div className="fit-ribbon"><span><b>ANCHOR</b>{evidencePath === "saved" ? activeProfile?.nickname ?? "Saved profile" : evidencePath === "manual" ? manualBrand || "Measured garment" : evidencePath === "unmeasured" || evidencePath === "remembered" ? unmeasuredBrand || "Preference only" : evidencePath === "body" ? "Body measurements" : anchorBrand || "Waiting for size"}</span><i className={evidencePath === "saved" || evidencePath === "body" || evidencePath === "manual" || evidencePath === "unmeasured" || evidencePath === "remembered" || anchorBrand ? "filled" : ""} /><span><b>TARGET</b>{selected?.brand || "Your passport"}</span></div></aside><section className="fit-panel"><div className="stepper">{fitQuestions.map((question, index) => <span key={question} title={question} className={fitStep === index ? "active" : fitStep > index ? "done" : ""}>{String(index + 1).padStart(2, "0")}</span>)}</div>
      {fitStep === 0 && <div className="question-card"><p className="question-count">Start here</p><h2>Have we met your wardrobe before?</h2>{profileSession === "loading" ? <p>Checking your retailer account for a saved Fit Passport.</p> : signedIn ? savedProfiles.length ? <><p>Your retailer account is connected. Choose whose saved Fit Passport to use for this item.</p><div className="choice-grid">{savedProfiles.map((profile) => <button key={profile.id} className={activeProfileId === profile.id ? "selected" : ""} onClick={() => { setActiveProfileId(profile.id); setEvidencePath("saved"); }}>{profile.nickname}</button>)}</div><div className="entry-options"><button disabled={!activeProfile} onClick={() => { setEvidencePath("saved"); setFitStep(3); }}><span>{activeProfile ? `Use ${activeProfile.nickname}'s saved fit` : "Choose a profile"}</span><small>Uses saved body measurements only</small><ArrowIcon /></button><button onClick={() => { setEvidencePath("body"); setFitStep(2); }}><span>Use one-time evidence</span><small>Measurements or an exact known garment</small><ArrowIcon /></button><button onClick={() => router.push("/fit-passport")}><span>Manage Fit Passport</span><small>Add or edit a profile in your retailer account</small><ArrowIcon /></button></div></> : <><p>Your retailer account is connected, but it has no Fit Passport profile yet.</p><div className="entry-options"><button onClick={() => router.push("/fit-passport")}><span>Set up Fit Passport</span><small>Add yourself or an additional member</small><ArrowIcon /></button><button onClick={() => { setEvidencePath("body"); setFitStep(2); }}><span>Continue without saving</span><small>Use session-only fit evidence</small><ArrowIcon /></button></div></> : <><p>{profileSession === "unavailable" ? "Your retailer account could not be checked right now. You can still use session-only fit evidence." : "Sign in through your retailer to retrieve saved Fit Passports. Guest fit checks stay in this browser session only."}</p><div className="entry-options"><button onClick={() => router.push("/fit-passport")}><span>Sign in to retailer account</span><small>Open the secure Fit Passport account flow</small><ArrowIcon /></button><button onClick={() => setFitStep(1)}><span>Start a new fit</span><small>Choose who you are shopping for</small><ArrowIcon /></button><button onClick={() => setFitStep(2)}><span>Continue as guest</span><small>Nothing is saved after this session</small><ArrowIcon /></button></div></>}</div>}
      {fitStep === 1 && <div className="question-card"><p className="question-count">01 · The basics</p><h2>Who are we fitting today?</h2><p>This prevents gift purchases and shared accounts from changing your personal fit profile.</p><div className="choice-grid three">{["Myself", "Someone else", "Just browsing"].map((choice) => <button key={choice} className={shoppingFor === choice ? "selected" : ""} onClick={() => setShoppingFor(choice)}>{choice}</button>)}</div><label className="field-label">Which collection are you shopping?<select defaultValue={selected?.gender || gender}><option>Women</option><option>Men</option><option>Both</option></select></label><label className="field-label">Height range <small>Optional, used only as a weak length signal</small><select defaultValue=""><option value="">Prefer not to say</option><option>Under 5′3″ / 160 cm</option><option>5′3″–5′7″ / 160–170 cm</option><option>5′8″–6′0″ / 171–183 cm</option><option>Over 6′0″ / 183 cm</option></select></label><div className="panel-actions"><button className="back" onClick={() => setFitStep(0)}>Back</button><button className="next" onClick={() => setFitStep(2)}>Continue <ArrowIcon /></button></div></div>}
      {fitStep === 2 && <div className="question-card anchor-question">
        <p className="question-count">02 · Your fit evidence</p>
        <h2>{selected ? "Measure the areas that matter." : "Tell us exactly how it fits."}</h2>
        {selected ? <>
          <p>{selected.name} is a {categoryNoun(selected.category)}. Choose the evidence you have. We never infer garment dimensions from a brand name and size label alone.</p>
          <div className="path-choice evidence-ladder"><button className={evidencePath === "known" ? "selected" : ""} onClick={() => { if (evidencePath !== "known") { setCategorySizeStatus("loading"); setEvidencePath("known"); } }}>Find a size I know<small>Use verified brand and category size data</small></button><button className={evidencePath === "manual" ? "selected" : ""} onClick={() => { setManualRequirementStatus("loading"); setEvidencePath("manual"); }}>Measure a garment that fits<small>Use any brand when the garment is available</small></button><button className={evidencePath === "body" ? "selected" : ""} onClick={() => setEvidencePath("body")}>Use body measurements<small>Enter the measurements needed for this category</small></button><button className={evidencePath === "unmeasured" ? "selected" : ""} onClick={() => { setManualRequirementStatus("loading"); setEvidencePath("unmeasured"); }}>I can&apos;t measure right now<small>Save fit context without making a size guess</small></button></div>
          {evidencePath === "body" && <>
            <div className="measurement-unit"><span>Measurement unit</span><div><button className={bodyUnit === "in" ? "selected" : ""} onClick={() => setBodyUnit("in")}>Inches</button><button className={bodyUnit === "cm" ? "selected" : ""} onClick={() => setBodyUnit("cm")}>Centimetres</button></div></div>
            <div className="body-measurement-grid">{targetMeasurementFields.map((field) => <label key={field.region} className="field-label">{field.label}<small>{field.hint}</small><input inputMode="decimal" value={bodyMeasurements[field.region] ?? ""} onChange={(event) => setBodyMeasurements((current) => ({ ...current, [field.region]: event.target.value }))} placeholder={bodyUnit === "in" ? "e.g. 32" : "e.g. 81"} aria-label={`${field.label} in ${bodyUnit === "in" ? "inches" : "centimetres"}`} /></label>)}</div>
            <p className="measurement-note">This product uses your measurements directly. Choose inches or centimetres; either produces the same result.</p>
          </>}
          {evidencePath === "known" && <>
            <label className="field-label">Brand of a {categoryNoun(selected.category)} you own<select value={categorySizeBrandId} disabled={categorySizeStatus === "loading"} onChange={(event) => {
              const brandId = event.target.value;
              const brand = categorySizeBrands.find((candidate) => candidate.brandId === brandId);
              setCategorySizeBrandId(brandId);
              setCategorySizeOptions([]);
              setCategorySizeReferenceId("");
              setUnmeasuredBrand(brandId === "__not_listed__" ? "" : brand?.brandName ?? "");
              setUnmeasuredLabelSize("");
              setFitFeedback(feedbackForGarmentType(referenceGarmentType(selected)));
              if (brand?.hasVerifiedReference) void loadCategorySizeOptions(selected, brandId);
              else if (brandId) setCategorySizeStatus("ready");
            }}><option value="">{categorySizeStatus === "loading" ? "Loading brands…" : "Choose a brand"}</option>{categorySizeBrands.map((brand) => <option key={brand.brandId} value={brand.brandId}>{brand.brandName}</option>)}<option value="__not_listed__">Brand not listed</option></select><small>All catalog brands that make this category appear here. A verified chart is required before we recommend a size.</small></label>
            {categorySizeStatus === "error" && <div className="anchor-empty" role="alert"><b>Verified size data is unavailable.</b><p>Use body measurements or measure a garment instead.</p><button type="button" onClick={() => setEvidencePath("body")}>Use body measurements</button></div>}
            {selectedCategorySizeBrand?.hasVerifiedReference && <><p className="measurement-note">Verified {categoryNoun(selected.category)} size data is available for {selectedCategorySizeBrand.brandName}.</p><label className="field-label">{categoryNoun(selected.category).replace(/^./, (letter) => letter.toUpperCase())} size you wear<select value={categorySizeReferenceId} disabled={categorySizeStatus === "loading"} onChange={(event) => selectCategorySizeReference(event.target.value)}><option value="">{categorySizeStatus === "loading" ? "Loading sizes…" : "Choose your size"}</option>{categorySizeOptions.map((size) => <option key={size.id} value={size.id}>{categorySizeLabel(selected.category, size)}</option>)}</select></label></>}
            {usesRememberedCategoryBrand && <><div className="form-row"><label className="field-label">{categorySizeBrandId === "__not_listed__" ? "Brand not listed" : "Brand"}<input value={unmeasuredBrand} readOnly={categorySizeBrandId !== "__not_listed__"} onChange={(event) => setUnmeasuredBrand(event.target.value)} placeholder="Enter the brand" /></label><label className="field-label">Size on the label<input value={unmeasuredLabelSize} onChange={(event) => setUnmeasuredLabelSize(event.target.value)} placeholder="e.g. M or 8" /></label></div><p className="measurement-note">We don&apos;t have a verified {categoryNoun(selected.category)} size chart for {unmeasuredBrand || "this brand"}. We can remember the label and how it fits, but we will not use it alone to recommend a size.</p><div className="fit-matrix"><div className="fit-matrix-head"><p className="mini-title">How does this {categoryNoun(selected.category)} size fit?</p><span>Saved as context only</span></div>{rememberedFitAreas.map((area) => <fieldset key={area.key} className="fit-area"><legend>{area.label} fit</legend><div>{area.options.filter((option) => option !== "Not applicable").map((option) => <label key={option} className={fitFeedback[area.key] === option ? "selected" : ""}><input type="radio" name={`remembered-size-${area.key}`} value={option} checked={fitFeedback[area.key] === option} onChange={() => setFitFeedback((current) => ({ ...current, [area.key]: option }))} /><span>{option === "Perfect" ? "Just right" : option}</span></label>)}</div></fieldset>)}</div></>}
            {selectedCategorySizeReference && <div className="fit-matrix"><div className="fit-matrix-head"><p className="mini-title">How does that {categoryNoun(selected.category)} size fit?</p><span>Only the target&apos;s relevant regions are used</span></div>{knownFitAreas.map((area) => <fieldset key={area.key} className="fit-area"><legend>{area.label} fit</legend><div>{area.options.filter((option) => option !== "Not applicable").map((option) => <label key={option} className={fitFeedback[area.key] === option ? "selected" : ""}><input type="radio" name={`category-size-${area.key}`} value={option} checked={fitFeedback[area.key] === option} onChange={() => setFitFeedback((current) => ({ ...current, [area.key]: option }))} /><span>{option === "Perfect" ? "Just right" : option}</span></label>)}</div></fieldset>)}</div>}
            <details className="optional-measurements"><summary>Advanced: use an exact catalog garment <span>Optional</span></summary><p className="measurement-note">Search the measured catalog if you know the exact garment and labelled size. This is stronger, product-level evidence.</p><button type="button" className="demo-login" onClick={() => setEvidencePath("exact")}>Choose an exact garment</button></details>
          </>}
          {evidencePath === "exact" && <><p className="measurement-note">Search for the exact garment and size you own. This is separate from the brand-and-category size flow.</p><div className="anchor-search"><input value={exactSearch} onChange={(event) => setExactSearch(event.target.value)} placeholder="Brand or garment name" aria-label="Exact garment search" /><button type="button" disabled={exactSearch.trim().length < 2 || exactStatus === "loading"} onClick={() => selected && void loadExactAnchors(selected, exactSearch)}>{exactStatus === "loading" ? "Searching…" : "Search"}</button></div>{exactStatus === "error" && <p className="anchor-search-message" role="alert">We could not search the measured catalog.</p>}{exactAnchors.length > 0 && <label className="field-label">Exact garment and size<select value={exactAnchorId} onChange={(event) => selectExactAnchor(event.target.value)}><option value="">Choose the exact garment and size</option>{exactAnchors.map((anchor) => <option key={anchor.id} value={anchor.id}>{anchor.brandName} · {anchor.productName} · {anchor.label}</option>)}</select></label>}{selectedExactAnchor && <div className="fit-matrix"><div className="fit-matrix-head"><p className="mini-title">How does your exact garment fit?</p><span>Only its recorded regions are used</span></div>{exactFitAreas.map((area) => <fieldset key={area.key} className="fit-area"><legend>{area.label} fit</legend><div>{area.options.filter((option) => option !== "Not applicable").map((option) => <label key={option} className={fitFeedback[area.key] === option ? "selected" : ""}><input type="radio" name={`exact-${area.key}`} checked={fitFeedback[area.key] === option} onChange={() => setFitFeedback((current) => ({ ...current, [area.key]: option }))} /><span>{option === "Perfect" ? "Just right" : option}</span></label>)}</div></fieldset>)}</div>}</>}
          {evidencePath === "exact" && <div className="panel-actions"><button className="back" onClick={() => setEvidencePath("known")}>Back</button><button className="next" disabled={!exactAnchorId || !exactAnswersComplete} onClick={() => setFitStep(3)}>Use exact garment <ArrowIcon /></button></div>}
          {evidencePath === "manual" && <>
            {manualRequirementStatus === "loading" && <p className="anchor-search-message" role="status">Loading the measurements needed for this garment…</p>}
            {manualRequirementStatus === "error" && <div className="anchor-empty" role="alert"><b>Measurement guide unavailable.</b><p>Try body measurements instead.</p><button type="button" onClick={() => setEvidencePath("body")}>Use body measurements</button></div>}
            {manualRequirementStatus === "ready" && <>
              <div className="form-row"><label className="field-label">Brand (optional)<input value={manualBrand} onChange={(event) => setManualBrand(event.target.value)} placeholder="Any brand" /></label><label className="field-label">Size on the label (optional)<input value={manualLabelSize} onChange={(event) => setManualLabelSize(event.target.value)} placeholder="e.g. M or 6" /></label></div>
              <label className="field-label">Garment name (optional)<input value={manualProduct} onChange={(event) => setManualProduct(event.target.value)} placeholder="e.g. black work dress" /></label>
              <div className="measurement-unit"><span>Measurement unit</span><div><button className={manualUnit === "in" ? "selected" : ""} onClick={() => setManualUnit("in")}>Inches</button><button className={manualUnit === "cm" ? "selected" : ""} onClick={() => setManualUnit("cm")}>Centimetres</button></div></div>
              <div className="manual-measurement-grid">{manualFields.map((field) => <article key={field.region} className="manual-measurement"><fieldset><legend>{field.inputLabel}</legend><small>{field.help}</small><input inputMode="decimal" value={manualValues[field.region] ?? ""} onChange={(event) => setManualValues((current) => ({ ...current, [field.region]: event.target.value }))} placeholder={manualUnit === "in" ? "e.g. 18" : "e.g. 46"} aria-label={`${field.inputLabel} value in ${manualUnit === "in" ? "inches" : "centimetres"}`} /></fieldset><fieldset className="manual-fit-choice"><legend>{formatFitRegion(field.region)} fit</legend><div>{(field.observationType === "length" ? ["Too short", "Just right", "Too long"] : ["Too tight", "Just right", "Too loose"]).map((option) => <label key={option} className={manualObservations[field.region] === option ? "selected" : ""}><input type="radio" name={`manual-${field.region}`} checked={manualObservations[field.region] === option} onChange={() => setManualObservations((current) => ({ ...current, [field.region]: option }))} /><span>{option}</span></label>)}</div></fieldset></article>)}</div>
              <p className="measurement-note">Measure the garment itself while it lies flat. Brand and label are for your reference only; the measurements drive the match.</p>
            </>}
          </>}
          {evidencePath === "unmeasured" && <>
            <div className="form-row"><label className="field-label">Brand (optional)<input value={unmeasuredBrand} onChange={(event) => setUnmeasuredBrand(event.target.value)} placeholder="Any brand" /></label><label className="field-label">Size on the label (optional)<input value={unmeasuredLabelSize} onChange={(event) => setUnmeasuredLabelSize(event.target.value)} placeholder="e.g. M or 6" /></label></div>
            <p className="measurement-note">If you remember how that garment feels, add it below. This context is useful, but without measured geometry we will not turn it into a size recommendation.</p>
            <div className="fit-matrix">{manualFields.map((field) => <fieldset key={field.region} className="fit-area"><legend>{formatFitRegion(field.region)} fit</legend><div>{(field.observationType === "length" ? ["Too short", "Just right", "Too long"] : ["Too tight", "Just right", "Too loose"]).map((option) => <label key={option} className={unmeasuredObservations[field.region] === option ? "selected" : ""}><input type="radio" name={`unmeasured-${field.region}`} checked={unmeasuredObservations[field.region] === option} onChange={() => setUnmeasuredObservations((current) => ({ ...current, [field.region]: option }))} /><span>{option}</span></label>)}</div></fieldset>)}</div>
          </>}
        </> : <>
          <p>Choose a garment you already own, then tell us how each area fits.</p>
          <div className="form-row"><label className="field-label">Brand<input value={anchorBrand} onChange={(event) => setAnchorBrand(event.target.value)} placeholder="e.g. Levi’s, Zara, Uniqlo" /></label><label className="field-label">Garment type<select value={anchorCategory} onChange={(event) => { setAnchorCategory(event.target.value); setFitFeedback(feedbackForGarmentType(event.target.value)); }}><option>Trousers</option><option>Jeans</option><option>Shorts</option><option>Skirt</option><option>Dress</option><option>Jacket</option><option>Shirt / top</option><option>Knitwear</option><option>Sweatshirt</option><option>Waistcoat</option></select></label></div>
          <label className="field-label">Size on the label<input value={anchorSize} onChange={(event) => setAnchorSize(event.target.value)} placeholder="e.g. 4, M, 32 × 30" /></label>
          <div className="fit-matrix"><div className="fit-matrix-head"><p className="mini-title">How does it fit?</p><span>Non-relevant areas are filled automatically; answer the remaining areas</span></div>{fitAreas.map((area) => <fieldset key={area.key} className="fit-area"><legend>{area.label}</legend><div>{area.options.map((option) => <label key={option} className={fitFeedback[area.key] === option ? "selected" : ""}><input type="radio" name={area.key} value={option} checked={fitFeedback[area.key] === option} onChange={() => setFitFeedback((current) => ({ ...current, [area.key]: option }))} /><span>{option}</span></label>)}</div></fieldset>)}</div>
        </>}
        {evidencePath !== "exact" && <div className="panel-actions"><button className="back" onClick={() => setFitStep(1)}>Back</button><button className="next" disabled={selected ? evidencePath === "body" ? !bodyEvidenceComplete : evidencePath === "known" ? usesRememberedCategoryBrand ? !unmeasuredBrand.trim() || !unmeasuredLabelSize.trim() || !rememberedAnswersComplete : !categorySizeReferenceId || !knownAnswersComplete : evidencePath === "manual" ? !manualRequest : false : !anchorBrand || !anchorSize || !fitAnswersComplete} onClick={() => { if (evidencePath === "unmeasured") { setProductFitResult(null); setProductFitStatus("idle"); setFitStep(4); } else if (evidencePath === "known" && usesRememberedCategoryBrand) { setEvidencePath("remembered"); setFitStep(3); } else setFitStep(3); }}>{selected ? evidencePath === "body" ? "Continue with measurements" : evidencePath === "known" ? usesRememberedCategoryBrand ? "Continue with remembered context" : "Use this size" : evidencePath === "manual" ? "Use these garment measurements" : "Continue without a measured recommendation" : "Use this anchor"} <ArrowIcon /></button></div>}
      </div>}
      {fitStep === 3 && <div className="question-card"><p className="question-count">03 · Your preference</p><h2>How do you want this garment to feel?</h2><p>Fit is personal. We preserve the intended silhouette while respecting how you like to wear it.</p><div className="anchor-recap"><b>{selected ? "Your evidence" : "Your anchor"}</b><span>{selected ? evidencePath === "saved" ? `Saved Fit Passport · ${activeProfile?.nickname ?? "profile"}` : evidencePath === "known" ? `${categoryNoun(selected.category).replace(/^./, (letter) => letter.toUpperCase())} size reference · ${selectedCategorySizeReference?.sizeLabel ?? ""}` : evidencePath === "exact" ? `Exact catalog garment · ${selectedExactAnchor?.label ?? ""}` : evidencePath === "remembered" ? `Remembered ${categoryNoun(selected.category)} size · ${unmeasuredLabelSize}` : evidencePath === "manual" ? `${manualFields.length} garment measurements · ${manualUnit === "in" ? "inches" : "centimetres"}` : `${targetMeasurementFields.length} body measurements · ${bodyUnit === "in" ? "inches" : "centimetres"}` : `${anchorBrand} · ${anchorCategory} · ${anchorSize}`}</span><small>{selected ? evidencePath === "saved" ? "Saved body measurements only · Manage details in Fit Passport" : evidencePath === "known" ? `${selectedCategorySizeReference?.brandName ?? "Verified reference"} · ${feedbackSummary}` : evidencePath === "exact" ? `${selectedExactAnchor?.brandName ?? "Catalog garment"} · ${selectedExactAnchor?.productName ?? ""} · ${feedbackSummary}` : evidencePath === "remembered" ? `${unmeasuredBrand} · ${feedbackSummary} · Context only, not used alone for recommendations` : evidencePath === "manual" ? `${manualBrand || "Unbranded garment"}${manualLabelSize ? ` · label ${manualLabelSize}` : ""} · ${manualFields.map((field) => field.inputLabel).join(" · ")}` : targetMeasurementFields.map((field) => field.label).join(" · ") : feedbackSummary}</small><button onClick={() => evidencePath === "saved" ? setFitStep(0) : setFitStep(2)}>{evidencePath === "saved" ? "Change profile" : evidencePath === "exact" ? "Edit exact garment" : "Edit fit details"}</button></div><div className="preference-cards">{[{ name: "Close", note: "Clean and body-skimming" }, { name: "Balanced", note: "The designer’s intended ease" }, { name: "Relaxed", note: "A little more room throughout" }].map((option) => <button key={option.name} className={fitPreference === option.name ? "selected" : ""} onClick={() => setFitPreference(option.name)}><i /><span>{option.name}<small>{option.note}</small></span></button>)}</div><label className="field-label">Anything we should avoid?<select defaultValue=""><option value="">No special preference</option><option>Tightness at waist</option><option>Tightness at hip</option><option>Tightness at chest</option><option>Short sleeves or inseam</option><option>Excess length</option></select></label><div className="consent-box" role="status"><span aria-hidden="true">○</span><p>{evidencePath === "saved" ? "Retailer-scoped Fit Passport" : "Session-only fit guidance"}<small>{evidencePath === "saved" ? "This fit check reads the selected profile. Update its saved details in Fit Passport." : evidencePath === "remembered" ? "This remembered brand, size and regional fit context is not used alone to recommend a size." : "These answers are not saved after this browser session."}</small></p></div><div className="panel-actions"><button className="back" onClick={() => evidencePath === "saved" ? setFitStep(0) : setFitStep(2)}>Back</button><button className="next" onClick={showSessionResult}>See my match <ArrowIcon /></button></div></div>}
      {fitStep === 4 && <div className="question-card result-card">{evidencePath === "unmeasured" || evidencePath === "remembered" ? <>
        <p className="question-count">04 · Remembered context</p><div className="confidence-ring"><span><b>—</b></span></div><h2 ref={resultHeadingRef} tabIndex={-1}>Remembered context for this visit.</h2><p>We don&apos;t have enough measured evidence to recommend a size. Your brand, label, and fit notes do not become invented garment measurements.</p><div className="result-explanation"><b>What this means</b><p>You can choose a size manually now, or add measured evidence for a defensible comparison.</p></div><button className="primary-button full" onClick={() => { setEvidencePath("body"); setFitStep(2); }}>Use body measurements <ArrowIcon /></button><button className="primary-button full secondary-result-action" onClick={() => { setManualRequirementStatus("loading"); setEvidencePath("manual"); setFitStep(2); }}>Measure a garment <ArrowIcon /></button><button className="demo-login" onClick={closeFit}>Choose a size manually</button>
      </> : productFitStatus === "loading" ? <>
        <p className="question-count">04 · Checking fit evidence</p><div className="confidence-ring"><span><b>…</b></span></div><h2>Finding your size.</h2><p>Comparing your {evidencePath === "saved" ? "saved Fit Passport measurements" : evidencePath === "known" ? "known garment observations" : evidencePath === "manual" ? "measured reference garment" : "stated measurements"} with this product’s synthetic garment measurements.</p>
      </> : productFitStatus === "error" ? <>
        <p className="question-count">04 · Fit unavailable</p><div className="confidence-ring"><span><b>!</b></span></div><h2 ref={resultHeadingRef} tabIndex={-1}>We could not complete that fit check.</h2><p>Your evidence was not saved. Please check it and try again.</p><button className="primary-button full" onClick={() => setFitStep(evidencePath === "saved" ? 0 : 2)}>Check evidence <ArrowIcon /></button>
      </> : productFitResult ? <>
        <p className="question-count">04 · Your fit result</p>
        <div className="confidence-ring"><span><b>{productFitResult.state === "RECOMMENDED" ? "FIT" : productFitResult.state === "TRADEOFF" ? "2" : "?"}</b></span></div>
        <h2 ref={resultHeadingRef} tabIndex={-1}>{productFitResult.state === "RECOMMENDED" && productFitResult.recommendedSizeLabel ? <>Try <em>{productFitResult.recommendedSizeLabel}</em></> : productFitResult.state === "TRADEOFF" ? "Two sizes need a choice." : productFitResult.state === "NO_SUITABLE_SIZE" ? "No size is a clear match." : "We need another measurement."}</h2>
        <p>{productFitResult.state === "RECOMMENDED" ? evidencePath === "manual" ? "Closest measured match to your garment. This compares finished garment dimensions directly; its brand and label did not affect the score." : evidencePath === "saved" ? `This recommendation uses ${savedFitEvidenceDescription(productFitResult.evidence?.used ?? [])} from ${activeProfile?.nickname ?? "the selected profile"}.` : `This recommendation uses ${evidencePath === "known" ? "the verified brand and category size reference you selected" : "the measurements you supplied"}.` : productFitResult.state === "TRADEOFF" ? productFitResult.nextSteps[0] : productFitResult.state === "NO_SUITABLE_SIZE" ? "The available sizes do not match the evidence closely enough. You can still choose a size manually." : "The selected evidence does not cover everything this item needs. Update it or use body measurements instead."}</p>
        {productFitResult.evidence?.missingRegions?.length ? <div className="missing-evidence"><b>Needed to continue</b><div>{productFitResult.evidence.missingRegions.map((region) => <span key={region}>{formatFitRegion(region)}</span>)}</div></div> : null}
        {productFitResult.state === "TRADEOFF" && productFitResult.options?.length ? <div className="tradeoff-options">{productFitResult.options.map((option, index) => <article key={`${option.sizeLabel}-${index}`}><p>Option {index + 1}</p><h3>Size {option.sizeLabel}</h3><div>{option.findings.map((finding) => <span key={finding.region}><b>{formatFitRegion(finding.region)}</b><small>{finding.assessment === "FIT" ? "Fits as requested" : formatFitFindingReason(finding.reason, finding.region)}</small></span>)}</div></article>)}</div> : productFitResult.findings.length > 0 && <div className="reason-panel">{productFitResult.findings.map((finding) => <span key={finding.region}><b>{formatFitRegion(finding.region)}</b><i><em style={{ width: finding.assessment === "FIT" ? "100%" : finding.assessment === "TIGHT" || finding.assessment === "LONG" ? "72%" : "45%" }} /></i><small>{formatFitFindingReason(finding.reason, finding.region)}</small></span>)}</div>}
        <div className="result-explanation"><b>What this means</b><p>{productFitResult.state === "RECOMMENDED" ? "Review the suggested label in the product details, then make the final size choice yourself." : productFitResult.state === "TRADEOFF" ? "Both sizes are plausible, with different regional trade-offs. Choose the one that matches your preference." : "MeasureOnce will not guess when the evidence is incomplete. Manual size selection remains available."}</p></div>
        {productFitResult.state === "RECOMMENDED" && productFitResult.recommendedSizeLabel ? <button className="primary-button full" onClick={closeFit}>Review {productFitResult.recommendedSizeLabel} in product details <ArrowIcon /></button> : productFitResult.state === "TRADEOFF" ? <button className="primary-button full" onClick={closeFit}>Compare these sizes in product details <ArrowIcon /></button> : <button className="primary-button full" onClick={() => setFitStep(evidencePath === "saved" ? 0 : 2)}>{evidencePath === "saved" ? "Change profile" : "Update fit evidence"} <ArrowIcon /></button>}
        <button className="demo-login" onClick={closeFit}>Return to product details</button>
      </> : <>
        <p className="question-count">04 · More evidence needed</p><div className="confidence-ring"><span><b>?</b></span></div><h2>Add evidence to check this fit.</h2><p>A brand and a size label alone do not describe the garment’s dimensions. We will not infer a recommendation from them.</p><button className="primary-button full" onClick={() => setFitStep(2)}>Add evidence <ArrowIcon /></button>
      </>}</div>}
    </section></div>}

    {checkoutOpen && <div className="overlay checkout-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCheckoutOpen(false)}><section className="checkout-drawer" role="dialog" aria-modal="true" aria-label="Checkout"><button className="close-button" onClick={() => setCheckoutOpen(false)}>×</button>{checkoutStep !== "confirmed" && <div className="checkout-progress"><span className={checkoutStep === "bag" ? "active" : "done"}>Bag</span><i /><span className={checkoutStep === "delivery" ? "active" : checkoutStep === "payment" ? "done" : ""}>Delivery</span><i /><span className={checkoutStep === "payment" ? "active" : ""}>Payment</span></div>}
      {checkoutStep === "bag" && <div className="checkout-content"><p className="eyebrow">Your bag</p><h2>{bagCount ? `${bagCount} ${bagCount === 1 ? "piece" : "pieces"}` : "Your bag is empty."}</h2>{cartDetails.length ? <><div className="bag-list">{cartDetails.map((item) => <article key={`${item.productId}-${item.size}`}><ProductArtwork product={item.product} /><div><small>{item.product.brand}</small><strong>{item.product.name}</strong><span>Size {item.size} · {item.product.colorName}</span><div className="quantity-control"><button onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}>−</button><b>{item.quantity}</b><button onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}>+</button></div><button className="remove-item" onClick={() => removeFromBag(item.productId, item.size)}>Remove</button></div><em>${item.product.price * item.quantity}</em></article>)}</div><div className="order-total"><span>Subtotal</span><strong>${subtotal}</strong><small>Complimentary standard delivery and returns</small></div><button className="primary-button full" onClick={() => setCheckoutStep("delivery")}>Continue to delivery <ArrowIcon /></button></> : <button className="primary-button full" onClick={() => { setCheckoutOpen(false); if (view !== "shop") router.push("/shop/women"); else document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }}>Explore the collection <ArrowIcon /></button>}</div>}
      {checkoutStep === "delivery" && <form className="checkout-content" onSubmit={(event) => { event.preventDefault(); setCheckoutStep("payment"); }}><p className="eyebrow">Delivery</p><h2>Where should it go?</h2><div className="checkout-fields"><label>Full name<input required defaultValue={signedIn ? shopperName : ""} autoComplete="name" /></label><label>Email<input required type="email" autoComplete="email" /></label><label className="wide">Street address<input required autoComplete="street-address" /></label><label>City<input required autoComplete="address-level2" /></label><label>State<input required autoComplete="address-level1" /></label><label>ZIP code<input required inputMode="numeric" autoComplete="postal-code" /></label><label>Country<select defaultValue="United States"><option>United States</option><option>Canada</option><option>United Kingdom</option></select></label></div><div className="delivery-option"><span><b>Standard delivery</b><small>3–5 business days</small></span><strong>Free</strong></div><div className="checkout-actions"><button type="button" onClick={() => setCheckoutStep("bag")}>Back to bag</button><button className="primary-button" type="submit">Continue to payment <ArrowIcon /></button></div></form>}
      {checkoutStep === "payment" && <form className="checkout-content" onSubmit={(event) => { event.preventDefault(); placeOrder(); }}><p className="eyebrow">Secure payment</p><h2>Complete your order.</h2><div className="payment-summary"><span>{bagCount} {bagCount === 1 ? "piece" : "pieces"}</span><strong>${subtotal}</strong></div><div className="checkout-fields"><label className="wide">Name on card<input required autoComplete="cc-name" /></label><label className="wide">Card number<input required inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" minLength={15} /></label><label>Expiration<input required autoComplete="cc-exp" placeholder="MM / YY" /></label><label>Security code<input required inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" /></label></div><label className="checkout-consent"><input type="checkbox" required /> I agree to the terms of sale and return policy.</label><div className="checkout-actions"><button type="button" onClick={() => setCheckoutStep("delivery")}>Back to delivery</button><button className="primary-button" type="submit">Place order · ${subtotal} <ArrowIcon /></button></div><p className="secure-note">Payment details are validated for this portfolio experience and are not transmitted.</p></form>}
      {checkoutStep === "confirmed" && <div className="checkout-content confirmation"><span className="confirmation-mark">✓</span><p className="eyebrow">Order confirmed</p><h2>Thank you, {shopperName.split(" ")[0]}.</h2><p>Your order <b>{orderNumber}</b> has been received. A confirmation would be sent to your email.</p><div><span>Standard delivery</span><strong>3–5 business days</strong></div><button className="primary-button full" onClick={() => { setCheckoutOpen(false); if (view !== "shop") router.push("/shop/women"); else document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }}>Continue shopping <ArrowIcon /></button></div>}
    </section></div>}
  </main>;
}
