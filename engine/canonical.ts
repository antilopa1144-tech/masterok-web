import type { FieldFactorName } from "./factors";
import type { ScenarioBundle } from "./scenarios";
import type { AccuracyMode, AccuracyExplanation } from "./accuracy";

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
  packageInfo?: { count: number; size: number; packageUnit: string };
}

/* ───────────────────────────────────────────────────────────────────────────
 * Сопутствующие материалы (companion materials).
 *
 * Декларативная схема: каждый материал описан в конфиге, движок
 * `engine/companion-materials.ts` парсит её и формирует CanonicalMaterialResult[].
 *
 * Источник истины: конфиг калькулятора. Никаких хардкоженых списков
 * материалов в engine/<calc>.ts. Это позволяет:
 *   - синхронизировать материалы с Flutter автоматически через sync:specs
 *   - условно включать материалы (skip_when/only_when)
 *   - поддерживать альтернативы (известь vs пластификатор)
 *   - менять материалы без правки кода
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Способ расчёта количества материала из входов/totals.
 *  - fixed: ровно N штук (например, кювета).
 *  - per_input: значение из input умножается на consumption (доорежки=N).
 *  - per_total: значение из totals × consumption (например, периметр × 0.5).
 *  - area_consumption: площадь (по totals_key) × расход на м² × reserve.
 *  - perimeter_consumption: периметр × расход на м × reserve.
 *  - volume_consumption: объём × расход × reserve.
 *  - per_count_step: fixed + ceil((base − step_from) / step) штук,
 *    с опциональным max. Используется для кистей/инструмента, где
 *    нужно расти ступеньками с площадью.
 *  - linear_overlap: для сеток/мембран — base × overlap_factor.
 */
export type CompanionFormula =
  | { type: "fixed"; value: number }
  | { type: "per_input"; input_key: string; per_unit: number }
  | { type: "per_total"; totals_key: string; per_unit: number }
  | {
      type: "area_consumption";
      totals_key: string;
      consumption_per_m2: number;
      reserve_factor?: number;
    }
  | {
      type: "perimeter_consumption";
      totals_key: string;
      consumption_per_m: number;
      reserve_factor?: number;
    }
  | {
      type: "volume_consumption";
      totals_key: string;
      consumption_per_m3: number;
      reserve_factor?: number;
    }
  | {
      type: "per_count_step";
      totals_key: string;
      fixed: number;
      step: number;
      max?: number;
    }
  | {
      type: "linear_overlap";
      totals_key: string;
      overlap_factor: number;
    };

/**
 * Условие включения/исключения материала.
 *
 *  - input_eq/input_neq: значение input == / != value
 *  - input_in: значение input ∈ values
 *  - input_gte/input_lte: сравнение с порогом
 *  - totals_gt/totals_lt: проверка против вычисленного значения
 *  - and/or: композиция условий
 *  - never: «никогда» (для отключения материала без удаления — debug)
 */
export type CompanionCondition =
  | { type: "input_eq"; input_key: string; value: number }
  | { type: "input_neq"; input_key: string; value: number }
  | { type: "input_in"; input_key: string; values: number[] }
  | { type: "input_gte"; input_key: string; value: number }
  | { type: "input_lte"; input_key: string; value: number }
  | { type: "totals_gt"; totals_key: string; value: number }
  | { type: "totals_lt"; totals_key: string; value: number }
  | { type: "and"; all: CompanionCondition[] }
  | { type: "or"; any: CompanionCondition[] }
  | { type: "never" };

/**
 * Информация об упаковке материала.
 * Если задана — exact_need округляется до целых упаковок (Math.ceil),
 * иначе округление до целой единицы (Math.ceil(exactNeed)).
 */
export interface CompanionPackageRule {
  size: number;
  /** Единица счёта упаковки в множ. числе: "мешков", "канистр", "рулонов", "вёдер". */
  unit: string;
}

/**
 * Декларация одного сопутствующего материала.
 *
 * Поля:
 *  - key: стабильный ID для дедупликации и тестов.
 *  - label: имя для пользователя на русском.
 *  - category: группировка в UI (Основное / Подготовка / Расходники / Инструмент / ...).
 *  - unit: единица измерения количества (л, кг, м², шт, ...).
 *  - formula: способ расчёта количества (см. CompanionFormula).
 *  - package: правила упаковки (опционально).
 *  - skip_when/only_when: условия включения.
 *  - alternative_group: материалы с одинаковым group взаимоисключаются —
 *    первый подходящий по условиям включается, остальные пропускаются.
 *    Используется для пары «известь vs пластификатор».
 *  - rationale: текст для UI/explainability — почему этот материал в списке.
 */
export interface CompanionMaterialSpec {
  key: string;
  label: string;
  category: string;
  unit: string;
  formula: CompanionFormula;
  package?: CompanionPackageRule;
  skip_when?: CompanionCondition;
  only_when?: CompanionCondition;
  alternative_group?: string;
  rationale?: string;
}

export interface CanonicalCalculatorResult {
  canonicalSpecId: string;
  formulaVersion: string;
  materials: CanonicalMaterialResult[];
  totals: Record<string, number>;
  warnings: string[];
  scenarios: ScenarioBundle;
  practicalNotes?: string[];
  accuracyMode?: AccuracyMode;
  accuracyExplanation?: AccuracyExplanation;
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
  avg_opening_area_m2: number;
  avg_opening_perimeter_m: number;
  tape_sides_per_opening: number;
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
  companion_materials?: CompanionMaterialSpec[];
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
  companion_materials?: CompanionMaterialSpec[];
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

export interface ScreedTypeSpec {
  id: number;
  key: string;
  label: string;
  density_kg_per_m3: number;
  /**
   * Per-type усадочный множитель: учитывает реальную потерю объёма при наборе
   * прочности и испарении влаги. Если отсутствует — fallback к глобальному
   * material_rules.volume_multiplier (для обратной совместимости spec'ов).
   * Источники: СП 29.13330.2011, тех. листы Knauf UBO / Bergauf BodenZement /
   * Stroyff РБСГ.
   */
  volume_multiplier?: number;
}

export interface ScreedPackagingRules {
  unit: string;
  bag_weights: number[];
}

export interface ScreedMaterialRules {
  volume_multiplier: number;
  cement_density: number;
  cement_fraction: number;
  sand_fraction: number;
  sand_density: number;
  water_per_m3: number;
  cps_density_ready: number;
  cps_density_semidry: number;
  fiber_kg_per_m2: number;
  mesh_margin: number;
  film_margin: number;
  damper_tape_reserve: number;
  beacons_area_per_piece: number;
  mesh_thickness_threshold_mm: number;
  min_thickness_mm: number;
  max_thickness_mm: number;
}

export interface ScreedWarningRules {
  thin_threshold_mm: number;
  thick_threshold_mm: number;
  large_area_cps_threshold_m2: number;
}

export interface ScreedCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    screed_types: ScreedTypeSpec[];
  };
  packaging_rules: ScreedPackagingRules;
  material_rules: ScreedMaterialRules;
  warnings_rules: ScreedWarningRules;
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

export interface BrickPackagingRules {
  unit: string;
  package_size: number;
}

export interface BrickMaterialRules {
  mortar_loss_factor: number;
  cement_kg_per_m3: number;
  cement_bag_kg: number;
  sand_m3_per_m3_mortar: number;
  mesh_joint_mm: number;
  mesh_overlap_factor: number;
  plasticizer_l_per_m3: number;
  flexible_ties_per_m2: number;
  flexible_ties_wall_thickness_threshold: number;
}

export interface BrickWarningRules {
  non_load_bearing_wall_thickness: number;
  manual_mix_grade_threshold: number;
}

export interface BrickCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    bricks_per_sqm: Record<string, Record<string, number>>;
    mortar_per_sqm: Record<string, Record<string, number>>;
    wall_thickness_mm: Record<string, number>;
    brick_height_mm: Record<string, number>;
    conditions_multiplier: Record<string, number>;
    waste_coeffs: Record<string, number>;
  };
  packaging_rules: BrickPackagingRules;
  material_rules: BrickMaterialRules;
  warnings_rules: BrickWarningRules;
  companion_materials?: CompanionMaterialSpec[];
}

export interface DrywallSheetSizeSpec {
  id: number;
  w: number;
  h: number;
  area: number;
}

export interface DrywallPackagingRules {
  unit: string;
  package_size: number;
}

export interface DrywallMaterialRules {
  sheet_reserve: number;
  profile_reserve: number;
  screws_tf_per_m2: number;
  screws_lb_per_profile: number;
  dowels_step_m: number;
  putty_start_kg_per_m2: number;
  putty_finish_kg_per_m2: number;
  putty_reserve: number;
  putty_bag_kg: number;
  serpyanka_m_per_sheet: number;
  serpyanka_reserve: number;
  serpyanka_roll_m: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can_l: number;
  sandpaper_m2_per_sheet: number;
  sandpaper_pack: number;
  profile_length_m: number;
  sealing_tape_roll_m: number;
}

export interface DrywallWarningRules {
  wide_profile_height_threshold: number;
}

export interface DrywallCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    sheet_sizes: Record<string, DrywallSheetSizeSpec>;
  };
  packaging_rules: DrywallPackagingRules;
  material_rules: DrywallMaterialRules;
  warnings_rules: DrywallWarningRules;
}

export interface ConcreteProportionSpec {
  grade: number;
  label: string;
  cement_kg: number;
  sand_m3: number;
  gravel_m3: number;
  water_l: number;
}

export interface ConcretePackagingRules {
  unit: string;
  volume_step_m3: number;
  cement_bag_kg: number;
  mastic_bucket_kg: number;
  film_roll_m2: number;
}

export interface ConcreteMaterialRules {
  waterproof_mastic_kg_per_m2: number;
  waterproof_reserve_factor: number;
  film_reserve_factor: number;
  sand_reserve_factor: number;
  gravel_reserve_factor: number;
  estimated_slab_thickness_m: number;
}

export interface ConcreteWarningRules {
  small_volume_threshold_m3: number;
  manual_mix_max_grade: number;
}

export interface ConcreteCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    proportions: ConcreteProportionSpec[];
  };
  packaging_rules: ConcretePackagingRules;
  material_rules: ConcreteMaterialRules;
  warnings_rules: ConcreteWarningRules;
  companion_materials?: CompanionMaterialSpec[];
}

export interface InsulationTypeSpec {
  id: number;
  key: string;
  label: string;
  dowels_per_sqm: number;
  /** Высота стандартной упаковки в мм для авто-расчёта числа плит в пачке.
   *  Минвата ~600 мм, ЭППС ~400 мм, ППС ~500 мм. Для сыпучих (эковата) = 0. */
  pack_height_mm: number;
  /** Справочная цена за 1 м² при толщине 100 мм, ₽. Для других толщин
   *  масштабируется линейно: cost = base × (thickness / 100). Эти цены
   *  усреднены по рынку РФ 2026; реальные могут отличаться по регионам. */
  cost_estimate_per_m2_at_100mm_rub: number;
}

export interface InsulationPlateSizeSpec {
  id: number;
  key: string;
  label: string;
  area_m2: number;
}

export interface InsulationPackagingRules {
  plate_unit: string;
  ecowool_unit: string;
}

export interface InsulationMaterialRules {
  plate_reserve: number;
  dowel_reserve: number;
  membrane_reserve: number;
  alu_tape_m2_per_m2: number;
  alu_tape_roll_m: number;
  glue_kg_per_m2: number;
  glue_bag_kg: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can_l: number;
  ecowool_density: number;
  ecowool_waste: number;
  ecowool_bag_kg: number;
}

export interface InsulationWarningRules {
  thin_thickness_threshold_mm: number;
  ecowool_settle_threshold_mm: number;
  professional_area_threshold_m2: number;
}

/**
 * Климатическая зона России для рекомендации толщины утепления стен.
 * Значения соответствуют СП 50.13330.2012 «Тепловая защита зданий»,
 * нормируемое сопротивление теплопередаче по ГСОП (градусо-сутки
 * отопительного периода). Для упрощения 5 крупных зон.
 */
export interface InsulationClimateZoneSpec {
  id: number;
  key: string;
  label: string;
  /** Минимально допустимая толщина утеплителя стен по СП 50.13330, мм. */
  min_thickness_walls_mm: number;
  /** Рекомендуемая толщина для комфортного дома, мм (обычно ≥ min). */
  rec_thickness_walls_mm: number;
}

/**
 * Пресет плотности утеплителя. Плотность определяет применение и цену:
 *  - 35 кг/м³ — лёгкая (каркас, кровля)
 *  - 45 кг/м³ — средняя (звукоизоляция, перегородки)
 *  - 80 кг/м³ — плотная (мокрый штукатурный фасад)
 *  - 100 кг/м³ — для вентфасада
 *  - 150 кг/м³ — кровля под стяжку
 *
 * `cost_multiplier` — поправочный коэффициент к базовой цене типа (плотная
 * минвата дороже лёгкой примерно в 2 раза). `applications` — список систем
 * монтажа (mountSystem id), для которых эта плотность подходит.
 */
export interface InsulationDensityPresetSpec {
  value: number;
  label: string;
  cost_multiplier: number;
  applications: number[];
}

export interface InsulationCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    insulation_types: InsulationTypeSpec[];
    plate_sizes: InsulationPlateSizeSpec[];
    climate_zones?: InsulationClimateZoneSpec[];
    density_presets?: InsulationDensityPresetSpec[];
  };
  packaging_rules: InsulationPackagingRules;
  material_rules: InsulationMaterialRules;
  warnings_rules: InsulationWarningRules;
  companion_materials?: CompanionMaterialSpec[];
}

export interface RebarPackagingRules {
  unit: string;
  package_size: number;
}

export interface RebarMaterialRules {
  slab_main_reserve_factor: number;
  slab_vertical_tie_spacing_m: number;
  slab_vertical_tie_extra_m: number;
  slab_fixators_per_m2: number;
  strip_rod_count: number;
  strip_stirrup_spacing_m: number;
  strip_assumed_width_m: number;
  strip_stirrup_diameter: number;
  belt_rod_count: number;
  belt_height_m: number;
  belt_width_m: number;
  belt_stirrup_spacing_m: number;
  belt_stirrup_diameter: number;
  floor_main_reserve_factor: number;
  floor_secondary_diameter: number;
  floor_secondary_step_multiplier: number;
}

export interface RebarWarningRules {
  slab_min_height_for_double_grid_m: number;
  min_diameter_for_foundation_mm: number;
  wide_step_threshold_mm: number;
}

export interface RebarCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    weight_per_meter: Record<string, number>;
    standard_rod_length_m: number;
    wire_length_per_intersection_m: number;
    wire_kg_per_m: number;
    rebar_overlap_factor: number;
    allowed_diameters: number[];
    allowed_grid_steps: number[];
  };
  packaging_rules: RebarPackagingRules;
  material_rules: RebarMaterialRules;
  warnings_rules: RebarWarningRules;
}

export interface RoofingTypeSpec {
  id: number;
  key: string;
  label: string;
}

export interface RoofingComplexitySpec {
  id: number;
  key: string;
  label: string;
  coefficient: number;
}

export interface RoofingGenericSheetSpec {
  id: number;
  key: string;
  label: string;
  effective_width: number;
  effective_height: number;
  area: number;
  fasteners_per_m2: number;
}

export interface RoofingPackagingRules {
  sheet_unit: string;
  tile_unit: string;
  pack_unit: string;
}

export interface RoofingMaterialRules {
  metal_tile_overlap_horizontal_m: number;
  metal_tile_overlap_vertical_m: number;
  metal_tile_screws_per_m2: number;
  metal_tile_ridge_element_m: number;
  metal_tile_ridge_reserve: number;
  metal_tile_snow_guard_spacing_m: number;
  metal_tile_waterproofing_reserve: number;
  metal_tile_waterproofing_roll_m2: number;
  metal_tile_batten_step_m: number;
  metal_tile_batten_reserve: number;
  metal_tile_counter_batten_step_m: number;
  metal_tile_counter_batten_reserve: number;
  /**
   * Порог уклона (град), ниже которого обрешётка под металлочерепицу должна
   * быть сплошной (по СП 17.13330.2017 — критическая точка для прочности
   * под снеговой нагрузкой). При slope < threshold engine переключает шаг
   * обрешётки с metal_tile_batten_step_m на solid_sheathing_step_m.
   * Опциональное поле для backward-compatibility.
   */
  solid_sheathing_slope_threshold_deg?: number;
  /**
   * Шаг обрешётки при пологом уклоне (фактически — сплошной настил доска
   * к доске). Опциональное поле, default ~ 0.1 м (доска 100 мм впритык).
   */
  solid_sheathing_step_m?: number;
  soft_pack_area_m2: number;
  soft_underlayment_roll_m2: number;
  soft_underlayment_reserve: number;
  soft_mastic_bucket_kg: number;
  soft_nails_per_m2: number;
  soft_nails_per_kg: number;
  soft_nails_reserve: number;
  soft_ridge_element_m: number;
  soft_ridge_reserve: number;
  soft_osb_sheet_m2: number;
  soft_osb_reserve: number;
  soft_vent_area_m2: number;
  soft_low_slope_threshold: number;
  generic_ridge_element_m: number;
  generic_ridge_reserve: number;
  generic_waterproofing_reserve: number;
  generic_waterproofing_roll_m2: number;
}

export interface RoofingWarningRules {
  metal_tile_min_slope: number;
  soft_roofing_min_slope: number;
  large_roof_area_threshold: number;
}

export interface RoofingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    roofing_types: RoofingTypeSpec[];
    complexity_profiles: RoofingComplexitySpec[];
    generic_sheet_specs: RoofingGenericSheetSpec[];
  };
  packaging_rules: RoofingPackagingRules;
  material_rules: RoofingMaterialRules;
  warnings_rules: RoofingWarningRules;
}

export interface AeratedConcreteBlockSizeSpec {
  l: number;
  h: number;
  t: number;
  label: string;
}

export interface AeratedConcretePackagingRules {
  unit: string;
  package_size: number;
}

export interface AeratedConcreteMaterialRules {
  glue_kg_per_m3: number;
  glue_bag_kg: number;
  block_reserve: number;
  rebar_armoring_interval: number;
  rebar_reserve: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can_l: number;
  corner_profile_length_m: number;
  corner_profile_count: number;
}

export interface AeratedConcreteWarningRules {
  non_load_bearing_thickness_mm: number;
  thermal_check_thickness_mm: number;
}

export interface AeratedConcreteCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    block_thickness_options: number[];
    block_height_options: number[];
    block_length_options: number[];
  };
  packaging_rules: AeratedConcretePackagingRules;
  material_rules: AeratedConcreteMaterialRules;
  warnings_rules: AeratedConcreteWarningRules;
}

export interface FoamBlockSizeSpec {
  l: number;
  h: number;
  t: number;
  label: string;
}

export interface FoamBlocksPackagingRules {
  unit: string;
  package_size: number;
}

export interface FoamBlocksMaterialRules {
  block_reserve: number;
  glue_kg_per_m3: number;
  glue_bag_kg: number;
  cps_kg_per_m3: number;
  cps_volume_per_m3: number;
  cps_bag_kg: number;
  mesh_interval: number;
  rebar_interval: number;
  rebar_reserve: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can_l: number;
}

export interface FoamBlocksWarningRules {
  non_load_bearing_thickness_mm: number;
}

export interface FoamBlocksCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    block_sizes: Record<string, FoamBlockSizeSpec>;
  };
  packaging_rules: FoamBlocksPackagingRules;
  material_rules: FoamBlocksMaterialRules;
  warnings_rules: FoamBlocksWarningRules;
}

/* ─── Brickwork (кирпичная кладка) ─── */

export interface BrickworkPackagingRules {
  unit: string;
  package_size: number;
}

export interface BrickworkMaterialRules {
  bricks_per_sqm: Record<string, Record<string, number>>;
  mortar_per_m3: Record<string, number>;
  wall_thickness_mm: Record<string, number>;
  brick_heights: Record<string, number>;
  bricks_per_pallet: Record<string, number>;
  block_reserve: number;
  mortar_density: number;
  mortar_bag_kg: number;
}

export interface BrickworkWarningRules {
  non_load_bearing_wall_thickness: number;
  armor_belt_height_threshold: number;
  armor_belt_wall_thickness_threshold: number;
}

export interface BrickworkCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    bricks_per_sqm: Record<string, Record<string, number>>;
    mortar_per_m3: Record<string, number>;
    wall_thickness_mm: Record<string, number>;
    brick_heights: Record<string, number>;
    bricks_per_pallet: Record<string, number>;
  };
  packaging_rules: BrickworkPackagingRules;
  material_rules: BrickworkMaterialRules;
  warnings_rules: BrickworkWarningRules;
}

/* ─── Facade Brick (облицовочный кирпич) ─── */

export interface FacadeBrickDimSpec {
  l: number;
  h: number;
}

export interface FacadeBrickPackagingRules {
  unit: string;
  package_size: number;
}

export interface FacadeBrickMaterialRules {
  brick_dims: Record<string, FacadeBrickDimSpec>;
  brick_reserve: number;
  masonry_thickness: number;
  mortar_volume_coeff: number;
  cement_kg_per_m3_mortar: number;
  cement_bag_kg: number;
  sand_coeff: number;
  ties_per_sqm: number;
  ties_reserve: number;
  hydro_coeff: number;
  hydro_reserve: number;
  hydro_roll_m2: number;
  vent_box_step_m: number;
  grout_kg_per_m2: number;
  grout_bag_kg: number;
  hydrophob_l_per_m2: number;
  hydrophob_reserve: number;
  hydrophob_can_l: number;
  /**
   * Высота полосы гидроизоляции над оконными перемычками, м (СП 15.13330.2020
   * раздел отвода влаги). По умолчанию 0.3 м — перекрывает стык перемычки и
   * зону капиллярной влаги. Опциональное поле для backward-compat.
   */
  lintel_band_height_m?: number;
  /**
   * Боковой запас полосы по бокам проёма, м. По умолчанию 0.3 м с каждой
   * стороны. Полоса для каждого окна имеет ширину = avgWindowWidth + 2 × side_extension_m.
   */
  lintel_band_side_extension_m?: number;
}

export interface FacadeBrickWarningRules {
  clinker_max_joint_mm: number;
  vent_gap_note: string;
}

export interface FacadeBrickCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    brick_dims: Record<string, FacadeBrickDimSpec>;
  };
  packaging_rules: FacadeBrickPackagingRules;
  material_rules: FacadeBrickMaterialRules;
  warnings_rules: FacadeBrickWarningRules;
}

/* ─── Fence (забор) ─── */

export interface FencePackagingRules {
  unit: string;
  package_size: number;
}

export interface FenceMaterialRules {
  post_burial_m: number;
  profnastil_useful_width: number;
  profnastil_reserve: number;
  profnastil_screws_per_sheet: number;
  screws_pack: number;
  primer_spray_m_per_can: number;
  post_concrete_m3: number;
  caps_reserve: number;
  rabica_roll_m: number;
  tension_wire_reserve: number;
  slat_width: number;
  slat_gap: number;
  slat_reserve: number;
  antiseptic_l_per_m2: number;
  antiseptic_can_l: number;
  gate_width: number;
  wicket_width: number;
}

export interface FenceWarningRules {
  reinforced_post_gate_threshold: number;
}

export interface FenceCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    fence_types: number[];
    post_steps: number[];
  };
  packaging_rules: FencePackagingRules;
  material_rules: FenceMaterialRules;
  warnings_rules: FenceWarningRules;
}

/* ─── Waterproofing (гидроизоляция) ─── */

export interface WaterproofingPackagingRules {
  unit: string;
  package_size: number;
}

export interface WaterproofingMaterialRules {
  consumption_per_layer: Record<string, number>;
  bucket_kg: Record<string, number>;
  tape_reserve: number;
  silicone_m_per_tube: number;
  primer_kg_per_m2: number;
  primer_can_kg: number;
  bitumen_l_per_m2: number;
  bitumen_can_l: number;
  joint_sealant_m_per_tube: number;
  /**
   * Дополнительная мастика на каждое примыкание трубы (стояк, подвод воды,
   * слив, душевая стойка). Default 1.0 кг — местное утолщение слоя
   * по периметру трубы радиусом ~150 мм. СП 71.13330.2017 раздел отвода
   * влаги в мокрых зонах. Опциональное поле для backward-compat.
   */
  mastic_per_pipe_penetration_kg?: number;
  /**
   * Дополнительная мастика на каждую инсталляцию (встроенная сантехника:
   * подвесной унитаз, бокс душевой, встроенный шкаф). Default 1.5 кг —
   * усиление гидроизоляции вокруг крупного узла.
   */
  mastic_per_inset_kg?: number;
  /**
   * Множители расхода мастики по классу кривизны пола:
   * 0 = ровный (после стяжки), 1.0;
   * 1 = средняя кривизна (старая стяжка), 1.10;
   * 2 = сильная кривизна (требуется локальное утолщение), 1.20.
   * Применяется к ОСНОВНОМУ расходу (totalArea × consumption × layers).
   */
  floor_curvature_multipliers?: Record<string, number>;
}

export interface WaterproofingWarningRules {
  min_layers_residential: number;
  min_wall_height_mm: number;
}

export interface WaterproofingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    mastic_types: number[];
    wall_heights: number[];
  };
  packaging_rules: WaterproofingPackagingRules;
  material_rules: WaterproofingMaterialRules;
  warnings_rules: WaterproofingWarningRules;
}

/* ─── Bathroom (ванная комната) ─── */

export interface BathroomTileSizeSpec {
  w: number;
  h: number;
}

export interface BathroomPackagingRules {
  unit: string;
  package_size: number;
}

export interface BathroomMaterialRules {
  floor_tile_sizes: Record<string, BathroomTileSizeSpec>;
  wall_tile_sizes: Record<string, BathroomTileSizeSpec>;
  tile_reserve: number;
  floor_adhesive_kg_per_m2: number;
  wall_adhesive_kg_per_m2: number;
  adhesive_bag_kg: number;
  grout_kg_per_m2: number;
  grout_bag_kg: number;
  waterproof_mastic_kg_per_m2: number;
  waterproof_bucket_kg: number;
  waterproof_wall_height: number;
  primer_l_per_m2: number;
  primer_can_l: number;
  crosses_per_tile: number;
  crosses_pack: number;
  silicone_m_per_tube: number;
}

export interface BathroomWarningRules {
  small_floor_area_threshold_m2: number;
  waterproofing_mandatory_code: string;
}

export interface BathroomCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    floor_tile_sizes: Record<string, BathroomTileSizeSpec>;
    wall_tile_sizes: Record<string, BathroomTileSizeSpec>;
  };
  packaging_rules: BathroomPackagingRules;
  material_rules: BathroomMaterialRules;
  warnings_rules: BathroomWarningRules;
}

/* ─── Warm Floor (тёплый пол) ─── */

export interface WarmFloorHeatingTypeSpec {
  id: number;
  key: string;
  label: string;
}

export interface WarmFloorPackagingRules {
  mat_unit: string;
  cable_unit: string;
  pipe_unit: string;
}

export interface WarmFloorMaterialRules {
  mat_area: number;
  cable_step_m: number;
  cable_reserve: number;
  pipe_step_m: number;
  pipe_reserve: number;
  substrate_reserve: number;
  substrate_roll_m2: number;
  corrugated_tube_m: number;
  tile_adhesive_kg_per_m2: number;
  tile_adhesive_bag_kg: number;
  eps_sheet_m2: number;
  eps_reserve: number;
  screed_thickness_m: number;
  screed_density: number;
  screed_bag_kg: number;
  mesh_reserve: number;
  mounting_tape_roll_m: number;
  pipe_insulation_reserve: number;
  max_circuit_m: number;
}

export interface WarmFloorWarningRules {
  separate_breaker_kw_threshold: number;
  ineffective_coverage_ratio: number;
}

export interface WarmFloorCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    heating_types: WarmFloorHeatingTypeSpec[];
  };
  packaging_rules: WarmFloorPackagingRules;
  material_rules: WarmFloorMaterialRules;
  warnings_rules: WarmFloorWarningRules;
}

/* ─── Warm Floor Pipes (трубы тёплого пола) ─── */

export interface WarmFloorPipesPipeTypeSpec {
  id: number;
  key: string;
  label: string;
}

export interface WarmFloorPipesPackagingRules {
  unit: string;
  coil_length_m: number;
}

export interface WarmFloorPipesMaterialRules {
  furniture_reduction: number;
  collector_addition_m: number;
  max_circuit_m: number;
  pipe_reserve: number;
  pipe_coil_m: number;
  epps_sheet_m2: number;
  epps_reserve: number;
  damper_tape_roll_m: number;
  damper_reserve: number;
  anchor_step_m: number;
  anchor_reserve: number;
  anchor_pack: number;
  screed_thickness_m: number;
  screed_density: number;
  screed_bag_kg: number;
  /**
   * Шаг трубы в зоне у окна (мм), при zonedLayoutEnabled=true.
   * По СП 60.13330.2020 для тепловой завесы у окна: 100-150 мм.
   * Default 120 мм. Опциональное поле для backward-compat.
   */
  window_zone_step_mm?: number;
  /**
   * Шаг трубы в центральной зоне (мм). Default 200 мм — та же норма,
   * что в существующем общем pipeStep.
   */
  central_zone_step_mm?: number;
  /**
   * Доля площади, относящаяся к зоне у окна (0..0.5).
   * Default 0.20 — типовая доля «холодной» зоны вдоль стены с окнами.
   */
  window_zone_fraction?: number;
}

export interface WarmFloorPipesWarningRules {
  multiple_circuits_pipe_threshold_m: number;
  professional_heat_loss_area_threshold_m2: number;
}

export interface WarmFloorPipesCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    pipe_types: WarmFloorPipesPipeTypeSpec[];
    allowed_pipe_steps_mm: number[];
  };
  packaging_rules: WarmFloorPipesPackagingRules;
  material_rules: WarmFloorPipesMaterialRules;
  warnings_rules: WarmFloorPipesWarningRules;
}

/* ─── Ventilation (вентиляция) ─── */

export interface VentilationBuildingTypeSpec {
  id: number;
  key: string;
  label: string;
  exchange_rate: number;
}

export interface VentilationDuctTypeSpec {
  id: number;
  key: string;
  label: string;
}

export interface VentilationPackagingRules {
  unit: string;
  package_size: number;
}

export interface VentilationMaterialRules {
  exchange_rates: number[];
  air_per_person: number;
  fan_reserve: number;
  airflow_rounding: number;
  main_duct_length_coeff: number;
  main_duct_reserve: number;
  duct_section_m: number;
  flex_duct_coil_m: number;
  fittings_per_section: number;
  fittings_reserve: number;
  grille_area_m2: number;
  grille_base: number;
  clamps_per_section: number;
  clamps_reserve: number;
  silencer_count: number;
}

export interface VentilationWarningRules {
  professional_airflow_threshold: number;
  supply_exhaust_people_threshold: number;
}

export interface VentilationCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    building_types: VentilationBuildingTypeSpec[];
    duct_types: VentilationDuctTypeSpec[];
  };
  packaging_rules: VentilationPackagingRules;
  material_rules: VentilationMaterialRules;
  warnings_rules: VentilationWarningRules;
}

/* ─── Gutters (водосточная система) ─── */

export interface GuttersPackagingRules {
  unit: string;
  package_size: number;
}

export interface GuttersMaterialRules {
  gutter_reserve: number;
  hook_step_m: number;
  hook_reserve: number;
  pipe_clamp_step_m: number;
  pipe_clamp_reserve: number;
  building_corners: number;
  connector_reserve: number;
  sealant_connections_per_tube: number;
  sealant_tube_ml: number;
  /** Расход герметика на стык желоба, мл (опционально, для будущего точного расчёта). */
  sealant_per_joint_ml?: number;
  recommended_funnel_interval_m: number;
}

export interface GuttersWarningRules {
  recommended_funnel_interval_m: number;
}

export interface GuttersCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    gutter_diameters: number[];
    gutter_lengths: number[];
  };
  packaging_rules: GuttersPackagingRules;
  material_rules: GuttersMaterialRules;
  warnings_rules: GuttersWarningRules;
}

/* ─── Electric (электрика) ─── */

export interface ElectricPackagingRules {
  cable_spool_m: number;
  unit: string;
}

export interface ElectricMaterialRules {
  cable_15_rate: number;
  cable_25_rate: number;
  cable_6_kitchen_factor: number;
  cable_6_reserve: number;
  /** Множитель кабеля для открытой проводки (учитывает обход углов и крепление). */
  cable_open_wiring_multiplier?: number;
  /** Множитель кабеля для скрытой проводки (по умолчанию 1.0). */
  cable_hidden_wiring_multiplier?: number;
  conduit_ratio: number;
  outlets_per_m2: number;
  outlets_per_room: number;
  switches_base: number;
  cable_spool_m: number;
  socket_box_reserve: number;
  ac_groups_divisor: number;
}

export interface ElectricWarningRules {
  three_phase_area_threshold: number;
}

export interface ElectricCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    wiring_types: { id: number; key: string; label: string }[];
  };
  packaging_rules: ElectricPackagingRules;
  material_rules: ElectricMaterialRules;
  warnings_rules: ElectricWarningRules;
}

/* ─── Heating (отопление) ─── */

export interface HeatingClimateZoneSpec {
  id: number;
  key: string;
  label: string;
  power_per_m2: number;
}

export interface HeatingBuildingTypeSpec {
  id: number;
  key: string;
  label: string;
  coefficient: number;
}

export interface HeatingRadiatorTypeSpec {
  id: number;
  key: string;
  label: string;
  watt_per_unit: number;
}

export interface HeatingPackagingRules {
  unit: string;
  package_size: number;
}

export interface HeatingMaterialRules {
  power_per_m2_base: number[];
  building_coeff: number[];
  radiator_power: number[];
  pp_pipe_stick_m: number;
  pipe_rate: number;
  pipe_reserve: number;
  fittings_per_room: number;
  fittings_reserve: number;
  brackets_per_room: number;
  brackets_reserve: number;
}

export interface HeatingWarningRules {
  gas_boiler_power_threshold_kw: number;
}

export interface HeatingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    climate_zones: HeatingClimateZoneSpec[];
    building_types: HeatingBuildingTypeSpec[];
    radiator_types: HeatingRadiatorTypeSpec[];
  };
  packaging_rules: HeatingPackagingRules;
  material_rules: HeatingMaterialRules;
  warnings_rules: HeatingWarningRules;
}

/* ─── Sewage (канализация) ─── */

export interface SewageSeptikTypeSpec {
  id: number;
  key: string;
  label: string;
}

export interface SewageGroundTypeSpec {
  id: number;
  key: string;
  label: string;
  gravel_m3: number;
}

export interface SewagePackagingRules {
  unit: string;
  package_size: number;
}

export interface SewageMaterialRules {
  liters_per_person_per_day: number;
  reserve_days: number;
  ring_volume_m3: number;
  eurocube_usable_m3: number;
  pipe_section_m: number;
  pipe_reserve: number;
  default_elbows: number;
  default_tees: number;
  gravel_by_ground: Record<string, number>;
  geotextile_factor: number;
  sand_backfill_factor: number;
}

export interface SewageWarningRules {
  bio_treatment_residents_threshold: number;
}

export interface SewageCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    septik_types: SewageSeptikTypeSpec[];
    ground_types: SewageGroundTypeSpec[];
  };
  packaging_rules: SewagePackagingRules;
  material_rules: SewageMaterialRules;
  warnings_rules: SewageWarningRules;
}

/* ─── Foundation Slab (фундаментная плита) ─── */

export interface FoundationSlabPackagingRules {
  unit: string;
  volume_step_m3: number;
}

export interface FoundationSlabMaterialRules {
  weight_per_meter: Record<string, number>;
  wire_per_joint: number;
  epps_plate_m2: number;
  geotextile_reserve: number;
  formwork_reserve: number;
  concrete_reserve: number;
  gravel_layer: number;
  sand_layer: number;
  insulation_reserve: number;
}

export interface FoundationSlabWarningRules {
  large_area_threshold_m2: number;
  thin_slab_threshold_mm: number;
}

export interface FoundationSlabCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: FoundationSlabPackagingRules;
  material_rules: FoundationSlabMaterialRules;
  warnings_rules: FoundationSlabWarningRules;
}

/* ─── Strip Foundation (ленточный фундамент) ─── */

export interface StripFoundationPackagingRules {
  unit: string;
  volume_step_m3: number;
}

export interface StripFoundationMaterialRules {
  rebar_diameters: Record<string, number>;
  rebar_threads: Record<string, number>;
  weight_per_m: Record<string, number>;
  clamp_weight: number;
  clamp_step: number;
  tech_loss: Record<string, number>;
  concrete_reserve: number;
  overlap: number;
}

export interface StripFoundationWarningRules {
  shallow_depth_threshold_mm: number;
  large_perimeter_threshold_m: number;
}

export interface StripFoundationCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: StripFoundationPackagingRules;
  material_rules: StripFoundationMaterialRules;
  warnings_rules: StripFoundationWarningRules;
}

/* ─── Stairs (лестница) ─── */

export interface StairsPackagingRules {
  unit: string;
  package_size: number;
}

export interface StairsMaterialRules {
  stringer_board: string;
  tread_board: string;
  riser_board: string;
  stringers_count: number;
  railing_spacing: number;
  concrete_density_for_stairs: number;
  rebar_kg_per_step_width: number;
}

export interface StairsWarningRules {
  steep_step_threshold_mm: number;
  max_steps_per_flight: number;
}

export interface StairsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: StairsPackagingRules;
  material_rules: StairsMaterialRules;
  warnings_rules: StairsWarningRules;
}

/* ─── Balcony (балкон) ─── */

export interface BalconyPackagingRules {
  unit: string;
  package_size: number;
}

export interface BalconyMaterialRules {
  panel_areas: Record<string, number>;
  batten_pitch: number;
  insulation_plate: number;
  insulation_reserve: number;
  finish_reserve: number;
  klaymer_per_panel: number;
  klaymer_reserve: number;
}

export interface BalconyWarningRules {
  large_balcony_area_threshold_m2: number;
  uninsulated_warning_threshold: number;
}

export interface BalconyCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: BalconyPackagingRules;
  material_rules: BalconyMaterialRules;
  warnings_rules: BalconyWarningRules;
}

/* ─── Attic (мансарда) ─── */

export interface AtticPackagingRules {
  unit: string;
  package_size: number;
}

export interface AtticMaterialRules {
  plate_thickness: Record<string, number>;
  plate_area: Record<string, number>;
  wind_membrane_roll: number;
  vapor_roll: number;
  tape_roll: number;
  plate_reserve: number;
  membrane_reserve: number;
  tape_area_coeff: number;
  panel_area: number;
  panel_reserve: number;
  batten_pitch: number;
  gkl_sheet: number;
  gkl_reserve: number;
  profile_step: number;
  putty_kg_per_m2: number;
  putty_bag: number;
}

export interface AtticWarningRules {
  thin_insulation_threshold_mm: number;
}

export interface AtticCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    insulation_types: number[];
    finish_types: number[];
    vapour_barrier_types: number[];
  };
  packaging_rules: AtticPackagingRules;
  material_rules: AtticMaterialRules;
  warnings_rules: AtticWarningRules;
}

/* ─── Terrace (терраса) ─── */

export interface TerracePackagingRules {
  unit: string;
  package_size: number;
}

export interface TerraceMaterialRules {
  board_widths: Record<string, number>;
  board_gaps: Record<string, number>;
  lag_length: number;
  treatment_l_per_m2: number;
  treatment_layers: Record<string, number>;
  geotextile_roll: number;
  board_reserve: number;
  lag_reserve: number;
  klaymer_count_per_lag_row: number;
}

export interface TerraceWarningRules {
  large_area_threshold_m2: number;
}

export interface TerraceCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    board_types: number[];
    board_lengths: number[];
    lag_steps: number[];
  };
  packaging_rules: TerracePackagingRules;
  material_rules: TerraceMaterialRules;
  warnings_rules: TerraceWarningRules;
}

/* ─── Blind Area / Отмостка ─── */

export interface BlindAreaPackagingRules {
  unit: string;
  package_size: number;
}

export interface BlindAreaMaterialRules {
  concrete_reserve: number;
  mesh_reserve: number;
  damper_reserve: number;
  gravel_layer: number;
  sand_layer: number;
  tile_reserve: number;
  tile_mix_kg_per_m2: number;
  border_length: number;
  membrane_reserve: number;
  geotextile_roll: number;
  epps_plate: number;
  epps_reserve: number;
}

export interface BlindAreaWarningRules {
  narrow_width_threshold_m: number;
  thin_concrete_threshold_mm: number;
}

export interface BlindAreaCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    material_types: number[];
    widths: number[];
    thicknesses: number[];
  };
  packaging_rules: BlindAreaPackagingRules;
  material_rules: BlindAreaMaterialRules;
  warnings_rules: BlindAreaWarningRules;
}

/* ─── Basement (подвал / цоколь) ─── */

export interface BasementPackagingRules {
  unit: string;
  package_size: number;
}

export interface BasementMaterialRules {
  floor_rebar_kg_per_m2: number;
  wall_rebar_kg_per_m2: number;
  wire_ratio: number;
  formwork_sheet_m2: number;
  formwork_reserve: number;
  geotextile_roll: number;
  drainage_membrane_roll: number;
  mastic_kg_per_m2: number;
  mastic_layers: number;
  roll_reserve: number;
  roll_m2: number;
  pen_kg_per_m2: number;
  pen_reserve: number;
  vent_per_area: number;
  min_vents: number;
  gravel_layer: number;
  sand_layer: number;
  epps_plate: number;
  epps_reserve: number;
}

export interface BasementWarningRules {
  deep_basement_threshold_m: number;
  thin_wall_threshold_mm: number;
}

export interface BasementCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    waterproof_types: number[];
    wall_thicknesses: number[];
    floor_thicknesses: number[];
  };
  packaging_rules: BasementPackagingRules;
  material_rules: BasementMaterialRules;
  warnings_rules: BasementWarningRules;
}

/* ─── Frame House (каркасный дом) ─── */

export interface FrameHousePackagingRules {
  unit: string;
  package_size: number;
}

export interface FrameHouseMaterialRules {
  outer_sheet_area: Record<string, number>;
  inner_sheet_area: Record<string, number>;
  insulation_thickness: Record<string, number>;
  plate_area: number;
  pack_size: number;
  vapor_roll: number;
  wind_roll: number;
  membrane_reserve: number;
  outer_reserve: number;
  inner_reserve: number;
  screws_per_sheet: number;
  nails_per_stud: number;
  screw_per_kg: number;
  nail_per_kg: number;
  stud_reserve: number;
  strapping_reserve: number;
  plate_reserve: number;
}

export interface FrameHouseWarningRules {
  large_wall_area_threshold_m2: number;
}

export interface FrameHouseCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    insulation_types: number[];
    stud_steps: number[];
  };
  packaging_rules: FrameHousePackagingRules;
  material_rules: FrameHouseMaterialRules;
  warnings_rules: FrameHouseWarningRules;
}

/* ─── Doors (двери) ─── */

export interface DoorsPackagingRules {
  unit: string;
  package_size: number;
}

export interface DoorsMaterialRules {
  door_dims: Record<string, [number, number]>;
  box_depth: number;
  foam_ml_per_m: number;
  foam_can_ml: number;
  screws_per_door: number;
  dubels_per_door: number;
  glue_cartridge_per_door: number;
  dobor_standard_h: number;
  nalichnik_standard_h: number;
  foam_reserve: number;
  screw_pack: number;
  dubel_pack: number;
}

export interface DoorsWarningRules {
  thick_wall_threshold_mm: number;
  bulk_door_threshold: number;
}

export interface DoorsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    door_types: number[];
    wall_thicknesses: number[];
  };
  packaging_rules: DoorsPackagingRules;
  material_rules: DoorsMaterialRules;
  warnings_rules: DoorsWarningRules;
}

/* ─── Windows (окна) ─── */

export interface WindowsPackagingRules {
  unit: string;
  package_size: number;
}

export interface WindowsMaterialRules {
  psul_roll_m: number;
  iflul_roll_m: number;
  psul_reserve: number;
  anchor_step: number;
  foam_per_perim: number;
  foam_reserve: number;
  windowsill_overhang: number;
  windowsill_roll: number;
  sandwich_panel_m2: number;
  gkl_sheet_m2: number;
  plaster_kg_per_m2: number;
  plaster_bag: number;
  slope_sandwich_reserve: number;
  slope_gkl_reserve: number;
  anchor_reserve: number;
  screw_reserve: number;
  f_profile_length: number;
}

export interface WindowsWarningRules {
  wide_window_threshold_mm: number;
  thick_wall_threshold_mm: number;
}

export interface WindowsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    slope_types: number[];
    window_widths: number[];
    window_heights: number[];
  };
  packaging_rules: WindowsPackagingRules;
  material_rules: WindowsMaterialRules;
  warnings_rules: WindowsWarningRules;
}

/* ─── Slopes (откосы) ─── */

export interface SlopesPackagingRules {
  unit: string;
  package_size: number;
}

export interface SlopesMaterialRules {
  panel_m2: number;
  gkl_m2: number;
  plaster_kg_per_m2: number;
  putty_kg_per_m2: number;
  primer_l_per_m2: number;
  corner_profile_m: number;
  f_profile_m: number;
  panel_reserve: number;
  plaster_reserve: number;
  putty_reserve: number;
  gkl_reserve: number;
  primer_reserve: number;
}

export interface SlopesWarningRules {
  wide_slope_threshold_mm: number;
  bulk_opening_threshold: number;
}

export interface SlopesCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    opening_types: number[];
    finish_types: number[];
    opening_dims: Record<string, [number, number, number]>;
  };
  packaging_rules: SlopesPackagingRules;
  material_rules: SlopesMaterialRules;
  warnings_rules: SlopesWarningRules;
}

/* ─── Gypsum Board / ГВЛ ─── */

export interface GypsumBoardPackagingRules {
  unit: string;
  package_size: number;
}

export interface GypsumBoardMaterialRules {
  sheet_area: number;
  sheet_reserve: number;
  pp_step_default: number;
  screws_gkl_per_sheet: number;
  dubel_step: number;
  dubel_reserve: number;
  serpyanka_reserve: number;
  putty_per_serpyanka: number;
  putty_bag: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  profile_length: number;
}

export interface GypsumBoardWarningRules {
  large_area_threshold_m2: number;
  double_layer_note: boolean;
}

export interface GypsumBoardCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    construction_types: number[];
    gkl_types: number[];
    profile_steps: number[];
  };
  packaging_rules: GypsumBoardPackagingRules;
  material_rules: GypsumBoardMaterialRules;
  warnings_rules: GypsumBoardWarningRules;
}

/* ─── Ceiling Cassette (кассетный потолок) ─── */

export interface CeilingCassettePackagingRules {
  unit: string;
  package_size: number;
}

export interface CeilingCassetteMaterialRules {
  cassette_areas: Record<string, number>;
  cassette_sizes: Record<string, number>;
  cassette_reserve: number;
  main_profile_spacing: number;
  cross_profile_spacing: number;
  hanger_spacing: number;
  wall_profile_length: number;
  wall_profile_reserve: number;
}

export interface CeilingCassetteWarningRules {
  large_area_threshold_m2: number;
}

export interface CeilingCassetteCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    cassette_sizes: number[];
  };
  packaging_rules: CeilingCassettePackagingRules;
  material_rules: CeilingCassetteMaterialRules;
  warnings_rules: CeilingCassetteWarningRules;
}

/* ─── Ceiling Insulation (утепление потолка) ─── */

export interface CeilingInsulationPackagingRules {
  unit: string;
  package_size: number;
}

export interface CeilingInsulationMaterialRules {
  plate_pack_m2: number;
  roll_areas: Record<string, number>;
  epps_plate: number;
  ecowool_density: number;
  ecowool_bag: number;
  plate_reserve: number;
  vapor_roll: number;
  vapor_reserve: number;
  tape_per_area: number;
}

export interface CeilingInsulationWarningRules {
  thin_insulation_threshold_mm: number;
  large_area_threshold_m2: number;
}

export interface CeilingInsulationCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    insulation_types: number[];
    thicknesses: number[];
  };
  packaging_rules: CeilingInsulationPackagingRules;
  material_rules: CeilingInsulationMaterialRules;
  warnings_rules: CeilingInsulationWarningRules;
}

/* ─── Ceiling Rail (реечный потолок) ─── */

export interface CeilingRailPackagingRules {
  unit: string;
  package_size: number;
}

export interface CeilingRailMaterialRules {
  rail_reserve: number;
  t_profile_spacing: number;
  t_profile_length: number;
  t_reserve: number;
  hanger_spacing: number;
  screws_per_hanger: number;
  screws_per_rail: number;
}

export interface CeilingRailWarningRules {
  large_area_threshold_m2: number;
}

export interface CeilingRailCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    rail_widths: number[];
    rail_lengths: number[];
  };
  packaging_rules: CeilingRailPackagingRules;
  material_rules: CeilingRailMaterialRules;
  warnings_rules: CeilingRailWarningRules;
}

/* ─── Ceiling Stretch (натяжной потолок) ─── */

export interface CeilingStretchPackagingRules {
  unit: string;
  package_size: number;
}

export interface CeilingStretchMaterialRules {
  baguet_reserve: number;
  baguet_length: number;
  insert_reserve: number;
  masking_tape_roll: number;
  /** Условный периметр одной ниши, м — учитывает 3 видимые стороны при глубине ниши ~0.4 м. */
  niche_perimeter_m_each?: number;
  /** Углы на нишу — 4 (короб с прямоугольной нишей). */
  niche_corner_count_each?: number;
}

export interface CeilingStretchWarningRules {
  large_area_threshold_m2: number;
  many_fixtures_threshold: number;
}

export interface CeilingStretchCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    ceiling_types: number[];
  };
  packaging_rules: CeilingStretchPackagingRules;
  material_rules: CeilingStretchMaterialRules;
  warnings_rules: CeilingStretchWarningRules;
}

/* ─── Sound Insulation (звукоизоляция) ─── */

export interface SoundInsulationPackagingRules {
  unit: string;
  package_size: number;
}

export interface SoundInsulationMaterialRules {
  rockwool_plate: number;
  rockwool_reserve: number;
  gkl_sheet: number;
  gkl_reserve_2layers: number;
  pp_spacing: number;
  pp_length: number;
  vibro_per_m2: number;
  vibro_reserve: number;
  vibro_tape_roll: number;
  zips_plate: number;
  zips_reserve: number;
  zips_dubels_per_panel: number;
  zips_dubel_reserve: number;
  float_mat_roll: number;
  float_reserve: number;
  damp_tape_roll: number;
  screed_thickness: number;
  screed_density: number;
  screed_bag: number;
  sealant_per_perim: number;
  seal_tape_roll: number;
  seal_tape_reserve: number;
}

export interface SoundInsulationWarningRules {
  large_area_threshold_m2: number;
  professional_system_note: boolean;
}

export interface SoundInsulationCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    surface_types: number[];
    systems: number[];
  };
  packaging_rules: SoundInsulationPackagingRules;
  material_rules: SoundInsulationMaterialRules;
  warnings_rules: SoundInsulationWarningRules;
}

/* ─── Facade Panels (фасадные панели) ─── */

export interface FacadePanelsPackagingRules {
  unit: string;
  package_size: number;
}

export interface FacadePanelsMaterialRules {
  panel_areas: Record<string, number>;
  panel_reserve: number;
  bracket_spacing_m2: number;
  bracket_reserve: number;
  guide_spacing: number;
  guide_length: number;
  guide_reserve: number;
  /** Шаг горизонтальных направляющих, м. Применяется при withHorizontalRails=1.
   *  По умолчанию 0.6 м — типовая горизонтальная обрешётка под фиброцемент/HPL. */
  horizontal_rail_step_m?: number;
  fasteners_per_panel: number;
  fastener_reserve: number;
  anchor_per_bracket: number;
  anchor_reserve: number;
  insulation_plate: number;
  insulation_reserve: number;
  insulation_dowels_per_m2: number;
  wind_membrane_roll: number;
  membrane_reserve: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  sealant_per_perim: number;
}

export interface FacadePanelsWarningRules {
  large_area_threshold_m2: number;
  thick_insulation_threshold_mm: number;
}

export interface FacadePanelsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    panel_types: number[];
    substructure_types: number[];
    insulation_thicknesses: number[];
  };
  packaging_rules: FacadePanelsPackagingRules;
  material_rules: FacadePanelsMaterialRules;
  warnings_rules: FacadePanelsWarningRules;
}

/* ─── Siding (сайдинг) ─── */

export interface SidingPackagingRules {
  unit: string;
  package_size: number;
}

export interface SidingMaterialRules {
  panel_areas: Record<string, number>;
  panel_reserve: number;
  starter_length: number;
  j_profile_length: number;
  corner_length: number;
  finish_length: number;
  screws_per_m2: number;
  screw_reserve: number;
  batten_step: number;
  batten_reserve: number;
  membrane_roll: number;
  membrane_reserve: number;
  sealant_per_perim: number;
  starter_reserve: number;
  j_reserve: number;
  corner_reserve: number;
}

export interface SidingWarningRules {
  large_net_area_threshold_m2: number;
  high_openings_ratio: number;
}

export interface SidingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    siding_types: number[];
  };
  packaging_rules: SidingPackagingRules;
  material_rules: SidingMaterialRules;
  warnings_rules: SidingWarningRules;
}

/* ─── Wall Panels (стеновые панели) ─── */

export interface WallPanelsPackagingRules {
  unit: string;
  package_size: number;
}

export interface WallPanelsMaterialRules {
  panel_areas: Record<string, number>;
  panel_reserve: number;
  glue_coverage: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  batten_spacing: Record<string, number>;
  batten_length: number;
  batten_reserve: number;
  dubel_step: number;
  klaymer_per_m2: number;
  molding_length: number;
  molding_reserve: number;
  sealant_per_perim: number;
}

export interface WallPanelsWarningRules {
  large_area_threshold_m2: number;
  flat_surface_warning_panel_types: number[];
}

export interface WallPanelsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    panel_types: number[];
    mount_methods: number[];
  };
  packaging_rules: WallPanelsPackagingRules;
  material_rules: WallPanelsMaterialRules;
  warnings_rules: WallPanelsWarningRules;
}

/* ─── Decorative Plaster (декоративная штукатурка) ─── */

export interface DecorPlasterPackagingRules {
  unit: string;
  package_size: number;
}

export interface DecorPlasterMaterialRules {
  consumption_kg_per_m2: Record<string, number>;
  plaster_reserve: number;
  primer_deep_l_per_m2: number;
  primer_deep_reserve: number;
  primer_can: number;
  tinted_primer_l_per_m2: number;
  tinted_can: number;
  pigment_per_25kg: number;
  wax_l_per_m2: number;
  wax_can: number;
}

export interface DecorPlasterWarningRules {
  large_area_threshold_m2: number;
  venetian_facade_texture_id: number;
}

export interface DecorPlasterCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    textures: number[];
    surfaces: number[];
  };
  packaging_rules: DecorPlasterPackagingRules;
  material_rules: DecorPlasterMaterialRules;
  warnings_rules: DecorPlasterWarningRules;
}

/* ─── Partitions (перегородки) ─── */

export interface PartitionsPackagingRules {
  unit: string;
  package_size: number;
}

export interface PartitionsMaterialRules {
  block_dims: Record<string, [number, number]>;
  glue_rate: Record<string, number>;
  gypsum_milk_rate: number;
  gypsum_bag: number;
  glue_bag: number;
  block_reserve: number;
  mesh_interval: number;
  mesh_reserve: number;
  mesh_roll: number;
  foam_per_perim: number;
  foam_can: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  seal_tape_reserve: number;
}

export interface PartitionsWarningRules {
  high_wall_threshold_m: number;
}

export interface PartitionsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    block_types: number[];
    thicknesses: number[];
  };
  packaging_rules: PartitionsPackagingRules;
  material_rules: PartitionsMaterialRules;
  warnings_rules: PartitionsWarningRules;
}

/* ─── Fasteners (крепёж) ─── */

export interface FastenersPackagingRules {
  unit: string;
  package_size: number;
}

export interface FastenersMaterialRules {
  screws_per_unit: Record<string, number>;
  base_step: Record<string, number>;
  screw_sizes: Record<string, string>;
  per_kg: Record<string, number>;
  unit_area: Record<string, number>;
  screw_reserve: number;
  klaymer_multiplier: number;
  frame_screws_per_unit: number;
  frame_screw_reserve: number;
  dubel_step: number;
  dubel_reserve: number;
  bits_per_screws: number;
}

export interface FastenersWarningRules {
  bulk_threshold: number;
}

export interface FastenersCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    material_types: number[];
    fastener_steps: number[];
  };
  packaging_rules: FastenersPackagingRules;
  material_rules: FastenersMaterialRules;
  warnings_rules: FastenersWarningRules;
}

/* ─── Tile Adhesive (плиточный клей) ─── */

export interface TileAdhesivePackagingRules {
  unit: string;
  default_bag_weight: number;
  allowed_bag_weights: number[];
}

export interface TileAdhesiveMaterialRules {
  base_consumption: Record<string, number>;
  wall_factor: number;
  street_factor: number;
  old_tile_factor: number;
  adhesive_reserve: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  tile_sizes_for_cross: Record<string, number>;
  crosses_per_tile: number;
  cross_reserve: number;
  cross_pack: number;
  /**
   * Множитель расхода клея при двойном нанесении (на основание + на тыл
   * плитки). По СП 71.13330.2017 для крупноформатной плитки (≥60 см
   * сторона) обязательно. Default 1.7. Опциональное поле для backward-compat.
   */
  double_application_multiplier?: number;
  /**
   * Минимальный класс формата (tileSize index), при котором автоматически
   * включается двойное нанесение. Default 3 — для крупноформата >60 см.
   * Если у пользователя tileSize >= порога, double_application_multiplier
   * применяется без ручного указания.
   */
  double_application_min_size_class?: number;
}

export interface TileAdhesiveWarningRules {
  large_tile_warning: boolean;
  old_tile_primer_warning: boolean;
}

export interface TileAdhesiveCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    tile_sizes: number[];
    laying_types: number[];
    base_types: number[];
  };
  packaging_rules: TileAdhesivePackagingRules;
  material_rules: TileAdhesiveMaterialRules;
  warnings_rules: TileAdhesiveWarningRules;
}

/* ─── Tile Grout (затирка для плитки) ─── */

export interface TileGroutPackagingRules {
  unit: string;
  default_bag_size: number;
  allowed_bag_sizes: number[];
}

export interface TileGroutMaterialRules {
  grout_density: Record<string, number>;
  grout_reserve: number;
}

export interface TileGroutWarningRules {
  wide_joint_threshold_mm: number;
  epoxy_warning: boolean;
}

export interface TileGroutCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    grout_types: number[];
    bag_sizes: number[];
  };
  packaging_rules: TileGroutPackagingRules;
  material_rules: TileGroutMaterialRules;
  warnings_rules: TileGroutWarningRules;
}

/* ─── Soft Roofing (гибкая черепица) ─── */

export interface SoftRoofingPackagingRules {
  unit: string;
  package_size: number;
}

export interface SoftRoofingMaterialRules {
  pack_area: number;
  pack_reserve: number;
  underlayment_roll: number;
  underlayment_full_reserve: number;
  slope_threshold: number;
  /** Legacy: единая ширина полосы подкладочного ковра по критическим зонам.
   *  Сохранено для backward-compat. Если задан — используется как fallback,
   *  если новые eave_band_width_m / valley_band_width_m / ridge_band_width_m
   *  не указаны. */
  critical_zone_width: number;
  /** Ширина полосы подкладочного ковра вдоль карниза (1.0 м по СП 17.13330.2017). */
  eave_band_width_m?: number;
  /** Ширина полосы вдоль ендовы (~1.5 м: 0.75 м с каждой стороны оси по СП 17.13330.2017). */
  valley_band_width_m?: number;
  /** Ширина полосы под коньком (~1.0 м: 0.5 м с каждой стороны конька по СП 17.13330.2017). */
  ridge_band_width_m?: number;
  valley_roll: number;
  valley_reserve: number;
  mastic_linear_rate: number;
  mastic_area_rate: number;
  mastic_bucket: number;
  nails_per_m2: number;
  nails_per_kg: number;
  nail_reserve: number;
  eave_strip_length: number;
  eave_reserve: number;
  wind_strip_ratio: number;
  ridge_shingle_step: number;
  ridge_reserve: number;
  osb_sheet: number;
  osb_reserve: number;
  vent_per_area: number;
}

export interface SoftRoofingWarningRules {
  low_slope_threshold: number;
  valley_warning: boolean;
}

export interface SoftRoofingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: SoftRoofingPackagingRules;
  material_rules: SoftRoofingMaterialRules;
  warnings_rules: SoftRoofingWarningRules;
}

/* ─── Facade Insulation (утепление фасада) ─── */

export interface FacadeInsulationPackagingRules {
  unit: string;
  package_size: number;
}

export interface FacadeInsulationMaterialRules {
  plate_m2: number;
  plate_reserve: number;
  glue_kg_per_m2: Record<string, number>;
  glue_bag: number;
  dowels_per_m2: Record<string, number>;
  dowel_reserve: number;
  mesh_reserve: number;
  mesh_roll: number;
  armor_kg_per_m2: number;
  armor_bag: number;
  primer_l_per_m2: number;
  primer_can_l: number;
  primer_reserve: number;
  decor_consumption: Record<string, number>;
  decor_bag: number;
  starter_length: number;
  starter_reserve: number;
}

export interface FacadeInsulationWarningRules {
  thick_insulation_threshold_mm: number;
  epps_adhesion_warning: boolean;
}

export interface FacadeInsulationCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    insulation_types: number[];
    finish_types: number[];
    thicknesses: number[];
  };
  packaging_rules: FacadeInsulationPackagingRules;
  material_rules: FacadeInsulationMaterialRules;
  warnings_rules: FacadeInsulationWarningRules;
}

/* ─── Drywall Ceiling ─── */

export interface DrywallCeilingPackagingRules {
  unit: string;
  package_size: number;
}

export interface DrywallCeilingMaterialRules {
  sheet_area: number;
  sheet_reserve: number;
  profile_reserve: number;
  cross_step: number;
  suspension_step: number;
  screws_per_sheet: number;
  screws_per_kg: number;
  screw_reserve: number;
  clop_per_susp: number;
  clop_per_crab: number;
  dowel_step: number;
  serpyanka_coeff: number;
  serpyanka_reserve: number;
  serpyanka_roll: number;
  putty_kg_per_m: number;
  putty_bag: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  profile_length: number;
}

export interface DrywallCeilingWarningRules {
  deformation_joint_area_threshold_m2: number;
}

export interface DrywallCeilingCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: DrywallCeilingPackagingRules;
  material_rules: DrywallCeilingMaterialRules;
  warnings_rules: DrywallCeilingWarningRules;
}

/* ─── 3D Panels ─── */

export interface Panels3dPackagingRules {
  unit: string;
  package_size: number;
}

export interface Panels3dMaterialRules {
  panel_reserve: number;
  glue_kg_per_m2: number;
  primer_l_per_m2: number;
  putty_kg_per_m2: number;
  paint_l_per_m2: number;
  varnish_l_per_m2: number;
  glue_bag: number;
  primer_can: number;
  putty_bag: number;
  paint_can: number;
  varnish_can: number;
}

export interface Panels3dWarningRules {
  large_area_threshold_m2: number;
}

export interface Panels3dCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: Panels3dPackagingRules;
  material_rules: Panels3dMaterialRules;
  warnings_rules: Panels3dWarningRules;
}

/* ─── MDF Panels ─── */

export interface MdfPanelsPackagingRules {
  unit: string;
  package_size: number;
}

export interface MdfPanelsMaterialRules {
  panel_reserve: number;
  profile_reserve: number;
  profile_step: number;
  standard_panel_length: number;
  clips_per_panel: number;
  plinth_length: number;
  plinth_extra: number;
}

export interface MdfPanelsWarningRules {
  large_area_threshold_m2: number;
}

export interface MdfPanelsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: MdfPanelsPackagingRules;
  material_rules: MdfPanelsMaterialRules;
  warnings_rules: MdfPanelsWarningRules;
}

/* ─── PVC Panels ─── */

export interface PvcPanelsPackagingRules {
  unit: string;
  package_size: number;
}

export interface PvcPanelsMaterialRules {
  panel_reserve: number;
  profile_reserve: number;
  profile_step: number;
  panel_lengths: number[];
  corner_profile_length: number;
  standard_corners: number;
}

export interface PvcPanelsWarningRules {
  large_area_threshold_m2: number;
}

export interface PvcPanelsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: PvcPanelsPackagingRules;
  material_rules: PvcPanelsMaterialRules;
  warnings_rules: PvcPanelsWarningRules;
}

/* ─── Wood Wall ─── */

export interface WoodWallPackagingRules {
  unit: string;
  package_size: number;
}

export interface WoodWallMaterialRules {
  board_reserve: number;
  antiseptic_l_per_m2: number;
  finish_l_per_m2: number;
  finish_layers: number;
  primer_l_per_m2: number;
  fasteners_per_board: number;
  clamps_per_board: number;
  batten_step: number;
  plinth_reserve: number;
  corner_ratio: number;
  corner_reserve: number;
}

export interface WoodWallWarningRules {
  large_area_threshold_m2: number;
}

export interface WoodWallCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: WoodWallPackagingRules;
  material_rules: WoodWallMaterialRules;
  warnings_rules: WoodWallWarningRules;
}

/* ─── Decor Stone ─── */

export interface DecorStonePackagingRules {
  unit: string;
  package_size: number;
}

export interface DecorStoneMaterialRules {
  stone_reserve: number;
  glue_kg_per_m2: number[];
  glue_reserve: number;
  glue_bag: number;
  primer_l_per_m2: number;
  primer_reserve: number;
  primer_can: number;
  grout_base_factor: number;
  grout_reserve: number;
  grout_bag: number;
}

export interface DecorStoneWarningRules {
  large_area_threshold_m2: number;
}

export interface DecorStoneCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: Record<string, never>;
  packaging_rules: DecorStonePackagingRules;
  material_rules: DecorStoneMaterialRules;
  warnings_rules: DecorStoneWarningRules;
}

/* ─── Drainage / Дренаж ─── */

export interface DrainagePackagingRules {
  unit: string;
  package_size: number;
}

export interface DrainageMaterialRules {
  pipe_reserve: number;
  pipe_coil_length_m: number;
  trench_width_m: number;
  sand_bedding_thickness_m: number;
  gravel_top_thickness_m: number;
  gravel_side_thickness_m: number;
  compaction_factor_sand: number;
  compaction_factor_gravel: number;
  geotextile_perimeter_factor: number;
  geotextile_reserve: number;
  geotextile_roll_m2: number;
  well_step_m: number;
  well_diameter_mm: number;
  collector_well_diameter_mm: number;
  tee_count_per_branch_type1: number;
  elbow_count_type0: number;
  elbow_count_type1: number;
  elbow_count_type2: number;
  min_slope_d110: number;
  min_slope_d160: number;
  extra_geotextile_high_groundwater: number;
}

export interface DrainageWarningRules {
  min_length_for_collector: number;
  max_length_d110_m: number;
  high_groundwater_threshold: number;
  min_well_count: number;
}

export interface DrainageCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    drainage_types: number[];
    pipe_diameters: number[];
    groundwater_risks: number[];
  };
  packaging_rules: DrainagePackagingRules;
  material_rules: DrainageMaterialRules;
  warnings_rules: DrainageWarningRules;
}

/* ─── Paving Tiles / Тротуарная плитка ─── */

export interface PavingTilesPackagingRules {
  unit: string;
  package_size: number;
}

export interface PavingTilesMaterialRules {
  tile_reserve: number;
  sand_bedding_layer_m: number;
  sand_bedding_layer_m_auto: number;
  gravel_layer_m: number;
  cement_sand_mix_layer_m: number;
  cement_sand_mix_kg_per_m3: number;
  cement_bag_kg: number;
  concrete_layer_m: number;
  concrete_reserve: number;
  joint_sand_kg_per_m2: number;
  joint_sand_bag_kg: number;
  joint_sand_reserve: number;
  border_length_m: number;
  border_reserve: number;
  border_concrete_m_per_m: number;
  geotextile_roll_m2: number;
  geotextile_reserve: number;
  compaction_factor_sand: number;
  compaction_factor_gravel: number;
  compaction_factor_cement_sand: number;
}

export interface PavingTilesWarningRules {
  thin_tile_for_vehicle_mm: number;
  min_tile_for_vehicle_mm: number;
  min_perimeter_to_area_ratio: number;
}

export interface PavingTilesCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    foundation_types: number[];
    tile_thicknesses: number[];
  };
  packaging_rules: PavingTilesPackagingRules;
  material_rules: PavingTilesMaterialRules;
  warnings_rules: PavingTilesWarningRules;
}

/* ─── Septic Rings / Септик ЖБИ-кольца ─── */

export interface SepticRingsPackagingRules {
  unit: string;
  package_size: number;
}

export interface SepticRingsMaterialRules {
  liters_per_person_per_day: number;
  reserve_days_small_family: number;
  reserve_days_large_family: number;
  large_family_threshold: number;
  ring_height_m: number;
  ring_volumes_m3: Record<string, number>;
  neck_ring_label: string;
  neck_rings_per_chamber: number;
  seal_rings_factor: number;
  mastic_kg_per_m2: number;
  mastic_layers: number;
  mastic_can_kg: number;
  bitumen_sheet_m_per_joint: number;
  bitumen_sheet_roll_m: number;
  filter_gravel_layer_m: number;
  filter_sand_layer_m: number;
  filter_gravel_compaction: number;
  filter_sand_compaction: number;
  pipe_diameter_mm: number;
  pipe_section_m: number;
  pipe_reserve: number;
  pipe_elbow_count: number;
  well_floor_plates: Record<string, string>;
  well_top_plates: Record<string, string>;
  manhole_label: string;
}

export interface SepticRingsWarningRules {
  biotreatment_recommended_residents: number;
  single_chamber_max_residents: number;
  clay_ground_filter_well_problematic: number;
  max_pipe_length_without_intermediate_well: number;
}

export interface SepticRingsCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    ring_diameters_mm: number[];
    chambers_counts: number[];
    ground_types: number[];
  };
  packaging_rules: SepticRingsPackagingRules;
  material_rules: SepticRingsMaterialRules;
  warnings_rules: SepticRingsWarningRules;
}

/* ─── Greenhouse / Теплица ─── */

export interface GreenhousePackagingRules {
  unit: string;
  package_size: number;
}

export interface GreenhouseMaterialRules {
  polycarbonate_sheet_width_m: number;
  polycarbonate_sheet_length_m: number;
  polycarbonate_reserve: number;
  thermal_washers_per_m2: number;
  thermal_washer_pack: number;
  h_profile_length_m: number;
  up_profile_length_m: number;
  frame_profile_section_label: string;
  frame_profile_pack_m: number;
  frame_profile_reserve: number;
  longitudinal_purlins_count: number;
  wood_beam_section_label: string;
  wood_beam_pack_m: number;
  wood_beam_reserve: number;
  wood_beam_crossbeam_step_m: number;
  screw_pile_step_m: number;
  screw_pile_corners_min: number;
  concrete_strip_width_m: number;
  concrete_strip_depth_m: number;
  concrete_reserve: number;
  anchor_step_m: number;
  door_width_m: number;
  door_height_m: number;
  vent_width_m: number;
  vent_height_m: number;
  sealing_tape_per_seam_factor: number;
  self_tapping_screws_per_m2: number;
}

export interface GreenhouseWarningRules {
  thin_polycarbonate_for_winter_mm: number;
  wide_step_for_winter_m: number;
  low_height_threshold_m: number;
  no_foundation_max_length_m: number;
}

export interface GreenhouseCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    roof_types: number[];
    polycarbonate_thicknesses: number[];
    foundation_types: number[];
  };
  packaging_rules: GreenhousePackagingRules;
  material_rules: GreenhouseMaterialRules;
  warnings_rules: GreenhouseWarningRules;
}

/* ─── Lawn / Газон ─── */

export interface LawnPackagingRules {
  unit: string;
  package_size: number;
}

export interface LawnMaterialRules {
  seed_rate_g_per_m2_decor: number;
  seed_rate_g_per_m2_normal: number;
  seed_rate_g_per_m2_sport: number;
  seed_pack_kg: number;
  seed_reserve: number;
  roll_size_m2: number;
  roll_reserve: number;
  fertilizer_starter_g_per_m2: number;
  fertilizer_pack_kg: number;
  fertilizer_reserve: number;
  rooting_stimulator_ml_per_m2: number;
  rooting_stimulator_can_l: number;
  topsoil_compaction_factor: number;
  drainage_sand_layer_m: number;
  drainage_sand_compaction: number;
  geotextile_reserve: number;
  geotextile_roll_m2: number;
  lawn_roller_min_pieces: number;
}

export interface LawnWarningRules {
  min_topsoil_thickness_cm: number;
  thin_topsoil_for_sport_cm: number;
  clay_ground_needs_drainage: number;
  large_area_needs_irrigation_m2: number;
}

export interface LawnCanonicalSpec extends CanonicalCalculatorSpecBase {
  normative_formula: {
    lawn_types: number[];
    ground_types: number[];
    usage_intensities: number[];
  };
  packaging_rules: LawnPackagingRules;
  material_rules: LawnMaterialRules;
  warnings_rules: LawnWarningRules;
}
