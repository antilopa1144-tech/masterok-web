import type { FieldFactorName } from "./factors";
import type { ScenarioBundle } from "./scenarios";

export interface CanonicalInputField {
  key: string;
  unit?: string;
  default_value: number;
  min?: number;
  max?: number;
}

export interface CanonicalMaterialResult {
  name: string;
  quantity: number;
  unit: string;
  withReserve?: number;
  purchaseQty?: number;
  category?: string;
}

export interface CanonicalCalculatorResult {
  canonicalSpecId: string;
  formulaVersion: string;
  materials: CanonicalMaterialResult[];
  totals: Record<string, number>;
  warnings: string[];
  scenarios: ScenarioBundle;
}

export interface CanonicalCalculatorSpecBase {
  calculator_id: string;
  formula_version: string;
  input_schema: CanonicalInputField[];
  field_factors: {
    enabled: FieldFactorName[];
  };
  scenario_policy: {
    contract: "min-rec-max-v1";
  };
}

export interface PuttyComponentSpec {
  key: "finish" | "start";
  label: string;
  category: string;
  enabled_for_putty_types: number[];
  consumption_kg_per_m2_mm: number;
  thickness_mm: number;
}

export interface PuttyQualityComponentProfile {
  consumption_kg_per_m2_layer: number;
  default_layers: number;
}

export interface PuttyQualityProfile {
  id: number;
  key: string;
  components: Partial<Record<PuttyComponentSpec["key"], PuttyQualityComponentProfile>>;
}

export interface PuttyAuxiliaryRules {
  primer_l_per_m2_per_coat: number;
  primer_coats: {
    finish_only: number;
    with_start: number;
    start_only: number;
  };
  serpyanka_linear_m_per_m2: number;
  serpyanka_reserve_factor: number;
  serpyanka_roll_length_m: number;
  sandpaper_m2_per_sheet: number;
  sandpaper_reserve_factor: number;
  sandpaper_enabled_for_putty_types: number[];
}

export interface PuttyWarningRules {
  mechanized_area_threshold_m2: number;
}

export interface PuttyPackagingRules {
  unit: string;
  default_package_size: number;
  allowed_package_sizes: number[];
}

export interface PuttyCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    components: PuttyComponentSpec[];
  };
  quality_profiles: PuttyQualityProfile[];
  packaging_rules: PuttyPackagingRules;
  material_rules: PuttyAuxiliaryRules;
  warnings_rules: PuttyWarningRules;
}

export interface PrimerSurfaceSpec {
  id: number;
  key: string;
  label: string;
  multiplier: number;
}

export interface PrimerTypeSpec {
  id: number;
  key: string;
  label: string;
  base_l_per_m2: number;
}

export interface PrimerPackagingRules {
  unit: string;
  default_package_size: number;
  allowed_package_sizes: number[];
}

export interface PrimerMaterialRules {
  roller_area_m2_per_piece: number;
  brushes_count: number;
  trays_count: number;
  drying_time_hours_by_type: Record<string, number>;
}

export interface PrimerWarningRules {
  absorbent_surface_ids: number[];
  recommended_double_coat_surface_ids: number[];
}

export interface PrimerCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    surface_types: PrimerSurfaceSpec[];
    primer_types: PrimerTypeSpec[];
  };
  packaging_rules: PrimerPackagingRules;
  material_rules: PrimerMaterialRules;
  warnings_rules: PrimerWarningRules;
}

export interface PaintScopeSpec {
  id: number;
  key: string;
  label: string;
}

export interface PaintSurfaceSpec {
  id: number;
  key: string;
  label: string;
  multiplier: number;
  scope_ids: number[];
}

export interface PaintPreparationSpec {
  id: number;
  key: string;
  label: string;
  multiplier: number;
}

export interface PaintColorSpec {
  id: number;
  key: string;
  label: string;
  multiplier: number;
}

export interface PaintPackagingRules {
  unit: string;
  default_package_size: number;
  allowed_package_sizes: number[];
  optimal_package_sizes: number[];
}

export interface PaintMaterialRules {
  primer_l_per_m2: number;
  primer_package_size_l: number;
  roller_area_m2_per_piece: number;
  brushes_count: number;
  trays_count: number;
  tape_roll_length_m: number;
  tape_runs_per_room: number;
  tape_reserve_factor: number;
  ceiling_premium_factor: number;
  default_roller_absorption_l: number;
}

export interface PaintWarningRules {
  primer_required_surface_ids: number[];
  one_coat_warning_threshold: number;
  rough_surface_warning_ids: number[];
}

export interface PaintCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    paint_types: PaintScopeSpec[];
    surface_types: PaintSurfaceSpec[];
    surface_preparations: PaintPreparationSpec[];
    color_intensities: PaintColorSpec[];
  };
  packaging_rules: PaintPackagingRules;
  material_rules: PaintMaterialRules;
  warnings_rules: PaintWarningRules;
}


export interface PlasterTypeSpec {
  id: number;
  key: string;
  label: string;
  base_kg_per_m2_10mm: number;
  default_bag_weight: number;
  allowed_bag_weights: number[];
}

export interface PlasterSubstrateSpec {
  id: number;
  key: string;
  label: string;
  multiplier: number;
  primer_type: 1 | 2;
}

export interface PlasterEvennessSpec {
  id: number;
  key: string;
  label: string;
  multiplier: number;
}

export interface PlasterPackagingRules {
  unit: string;
}

export interface PlasterMaterialRules {
  reserve_factor: number;
  deep_primer_l_per_m2: number;
  contact_primer_kg_per_m2: number;
  primer_package_size: number;
  beacons_area_m2_per_piece: number;
  beacon_thin_size_mm: number;
  beacon_standard_size_mm: number;
  thin_beacon_threshold_mm: number;
  mesh_overlap_factor: number;
  rule_size_m: number;
  rule_count: number;
  spatulas_count: number;
  buckets_count: number;
  mixer_count: number;
  gloves_pairs: number;
  corner_profile_length_m: number;
  corner_profile_count: number;
}

export interface PlasterWarningRules {
  gypsum_two_layer_threshold_mm: number;
  mesh_threshold_mm: number;
  small_area_threshold_m2: number;
  thick_layer_warning_threshold_mm: number;
  obryzg_tip_substrate_ids: number[];
  obryzg_tip_evenness_ids: number[];
}

export interface PlasterCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    plaster_types: PlasterTypeSpec[];
    substrate_types: PlasterSubstrateSpec[];
    wall_evenness_profiles: PlasterEvennessSpec[];
  };
  packaging_rules: PlasterPackagingRules;
  material_rules: PlasterMaterialRules;
  warnings_rules: PlasterWarningRules;
}

export interface WallpaperTypeSpec {
  id: number;
  key: string;
  label: string;
  paste_kg_per_m2: number;
}

export interface WallpaperOpeningDefaultsSpec {
  door_area_m2: number;
  window_area_m2: number;
}

export interface WallpaperPackagingRules {
  roll_unit: string;
  roll_package_size: number;
  paste_pack_kg: number;
  primer_can_l: number;
}

export interface WallpaperMaterialRules {
  trim_allowance_m: number;
  primer_l_per_m2: number;
  primer_reserve_factor: number;
  paste_reserve_factor: number;
  glue_roller_count: number;
  wallpaper_spatula_count: number;
  knife_count: number;
  blades_pack_count: number;
  bucket_count: number;
  sponge_count: number;
}

export interface WallpaperWarningRules {
  large_rapport_threshold_m: number;
  wide_roll_threshold_m: number;
  low_strips_per_roll_threshold: number;
}

export interface WallpaperCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    wallpaper_types: WallpaperTypeSpec[];
    opening_defaults: WallpaperOpeningDefaultsSpec;
  };
  packaging_rules: WallpaperPackagingRules;
  material_rules: WallpaperMaterialRules;
  warnings_rules: WallpaperWarningRules;
}

export interface TileLayoutSpec {
  id: number;
  key: string;
  label: string;
  waste_percent: number;
}

export interface TileRoomComplexitySpec {
  id: number;
  key: string;
  label: string;
  waste_bonus_percent: number;
}

export interface TilePackagingRules {
  tile_unit: string;
  tile_package_size: number;
  glue_bag_kg: number;
  grout_bag_kg: number;
  primer_can_l: number;
  svp_pack_size: number;
}

export interface TileMaterialRules {
  glue_kg_per_m2_small: number;
  glue_kg_per_m2_medium: number;
  glue_kg_per_m2_large: number;
  glue_kg_per_m2_xl: number;
  primer_l_per_m2: number;
  grout_density_kg_per_m3: number;
  grout_loss_factor: number;
  crosses_reserve_factor: number;
  svp_threshold_cm: number;
  large_tile_extra_waste_percent: number;
  mosaic_waste_discount_percent: number;
  silicone_tube_area_m2: number;
}

export interface TileWarningRules {
  low_tile_count_threshold: number;
  large_tile_warning_threshold_cm: number;
  herringbone_large_area_m2: number;
}

export interface TileCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    layouts: TileLayoutSpec[];
    room_complexities: TileRoomComplexitySpec[];
  };
  packaging_rules: TilePackagingRules;
  material_rules: TileMaterialRules;
  warnings_rules: TileWarningRules;
}

export interface LaminateLayoutProfileSpec {
  id: number;
  key: string;
  label: string;
  waste_percent: number;
}

export interface LaminatePackagingRules {
  laminate_pack_area_unit: string;
  plinth_piece_length_m: number;
  underlayment_roll_area_m2: number;
}

export interface LaminateMaterialRules {
  small_room_threshold_m2: number;
  small_room_waste_per_m2_percent: number;
  reserve_percent_default: number;
  underlayment_overlap_percent: number;
  vapor_barrier_overlap_percent: number;
  wedge_spacing_m: number;
  default_door_opening_width_m: number;
  rectangle_inner_corners: number;
}

export interface LaminateWarningRules {
  small_area_warning_threshold_m2: number;
  diagonal_warning_profile_ids: number[];
  herringbone_warning_profile_ids: number[];
  half_shift_warning_profile_ids: number[];
}

export interface LaminateCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    layout_profiles: LaminateLayoutProfileSpec[];
  };
  packaging_rules: LaminatePackagingRules;
  material_rules: LaminateMaterialRules;
  warnings_rules: LaminateWarningRules;
}

export interface ParquetLayoutProfileSpec {
  id: number;
  key: string;
  label: string;
  waste_percent: number;
}

export interface ParquetPackagingRules {
  parquet_pack_area_unit: string;
  underlayment_roll_area_m2: number;
  plinth_piece_length_m: number;
  glue_bucket_kg: number;
}

export interface ParquetMaterialRules {
  reserve_percent_default: number;
  underlayment_overlap_percent: number;
  wedge_spacing_m: number;
  default_door_opening_width_m: number;
  glue_kg_per_m2: number;
  plinth_reserve_percent: number;
}

export interface ParquetWarningRules {
  small_area_warning_threshold_m2: number;
  diagonal_warning_profile_ids: number[];
  herringbone_warning_profile_ids: number[];
}

export interface ParquetCanonicalSpec {
  calculator_id: string;
  formula_version: string;
  input_schema: CanonicalInputField[];
  field_factors: {
    enabled: FieldFactorName[];
  };
  normative_formula: {
    layout_profiles: ParquetLayoutProfileSpec[];
  };
  packaging_rules: ParquetPackagingRules;
  material_rules: ParquetMaterialRules;
  warnings_rules: ParquetWarningRules;
  scenario_policy: {
    contract: string;
  };
}


export interface LinoleumPackagingRules {
  linear_meter_unit: string;
  linear_meter_step_m: number;
  plinth_piece_length_m: number;
  primer_can_liters: number;
  glue_bucket_kg: number;
  cold_welding_tube_linear_m: number;
}

export interface LinoleumMaterialRules {
  trim_allowance_m: number;
  room_margin_m: number;
  glue_kg_per_m2: number;
  primer_liters_per_m2: number;
  plinth_reserve_percent: number;
  default_door_opening_width_m: number;
  tape_extra_perimeter_run: number;
}

export interface LinoleumWarningRules {
  high_waste_percent_threshold: number;
  max_single_roll_width_m: number;
  low_roll_width_warning_threshold_m: number;
}

export interface LinoleumCanonicalSpec {
  calculator_id: string;
  formula_version: string;
  input_schema: CanonicalInputField[];
  field_factors: {
    enabled: FieldFactorName[];
  };
  normative_formula: Record<string, never>;
  packaging_rules: LinoleumPackagingRules;
  material_rules: LinoleumMaterialRules;
  warnings_rules: LinoleumWarningRules;
  scenario_policy: {
    contract: string;
  };
}

export interface SelfLevelingMixtureTypeSpec {
  id: number;
  key: string;
  label: string;
  base_kg_per_m2_mm: number;
}

export interface SelfLevelingPackagingRules {
  unit: string;
  primer_can_l: number;
  tape_roll_m: number;
}

export interface SelfLevelingMaterialRules {
  reserve_factor: number;
  primer_l_per_m2: number;
  leveling_min_thickness_mm: number;
  finish_max_thickness_mm: number;
  deformation_joint_area_threshold_m2: number;
}

export interface SelfLevelingWarningRules {
  large_area_threshold_m2: number;
}

export interface SelfLevelingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    mixture_types: SelfLevelingMixtureTypeSpec[];
  };
  packaging_rules: SelfLevelingPackagingRules;
  material_rules: SelfLevelingMaterialRules;
  warnings_rules: SelfLevelingWarningRules;
}
