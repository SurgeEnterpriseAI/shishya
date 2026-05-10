// JEE Advanced 2026 — full syllabus tree as published by JAB on jeeadv.ac.in.
// Note: JEE Advanced 2026 syllabus is identical to JEE Advanced 2025.
// Conducted by IIT Roorkee for IIT admissions. Two papers, three hours each.
// Source: jeeadv.ac.in/documents/jee-advanced-2026-syllabus.pdf
//
// Run after seedExams: npx tsx seed/exams/jee-advanced-syllabus.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface TopicSeed {
  code: string;
  name: string;
  description?: string;
  weight?: number;
  subtopics?: TopicSeed[];
}

interface SubjectSeed {
  code: string;
  name: string;
  weight: number;
  topics: TopicSeed[];
}

export const jeeAdvancedSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      {
        code: "phy.general",
        name: "General",
        description: "Units and dimensions, dimensional analysis; least count, significant figures; methods of measurement and error analysis for prescribed experiments.",
        subtopics: [
          { code: "phy.gen.units", name: "Units and Dimensions", description: "Dimensional analysis, dimensional formulae, applications and limitations." },
          { code: "phy.gen.errors", name: "Error Analysis", description: "Least count, significant figures, propagation of errors in measurements." },
          { code: "phy.gen.experiments", name: "Prescribed Experiments", description: "Vernier callipers, screw gauge, simple pendulum, Young's modulus, surface tension by capillary rise, calorimeter, focal length of mirror/lens by u-v method, speed of sound by resonance column, Ohm's law, meter bridge, post office box." },
        ],
      },
      {
        code: "phy.mechanics",
        name: "Mechanics",
        description: "Kinematics in 1D and 2D; Newton's laws of motion; conservation of momentum and energy; rotational mechanics; gravitation; fluid statics and dynamics; oscillations and waves.",
        subtopics: [
          { code: "phy.mech.kinematics", name: "Kinematics", description: "1D and 2D kinematics in Cartesian coordinates; projectiles; uniform circular motion; relative velocity." },
          { code: "phy.mech.newton", name: "Newton's Laws and Friction", description: "Inertial and uniformly accelerated frames; static and dynamic friction." },
          { code: "phy.mech.energy_momentum", name: "Energy and Momentum", description: "Kinetic and potential energy; work and power; conservation of momentum and mechanical energy; impulse; elastic and inelastic collisions." },
          { code: "phy.mech.rotation", name: "Rotational Mechanics", description: "Rigid body, moment of inertia, parallel and perpendicular axes theorems; torque; angular momentum; rolling without slipping; equilibrium." },
          { code: "phy.mech.shm", name: "Simple Harmonic Motion", description: "Linear and angular SHM; forced and damped oscillations; resonance." },
          { code: "phy.mech.elasticity", name: "Elasticity", description: "Hooke's law; Young's modulus." },
          { code: "phy.mech.gravitation", name: "Gravitation", description: "Law of gravitation; gravitational potential and field; Kepler's laws; geostationary orbits; escape velocity." },
          { code: "phy.mech.fluids", name: "Fluid Mechanics", description: "Pressure, Pascal's law, buoyancy, surface tension, capillarity, viscosity (excl. Poiseuille), Stokes' law, terminal velocity, Bernoulli's theorem and applications." },
          { code: "phy.mech.waves", name: "Wave Motion", description: "Plane waves only; longitudinal and transverse; superposition; progressive and stationary waves; vibration of strings and air columns; resonance; beats; speed of sound; Doppler effect in sound." },
        ],
      },
      {
        code: "phy.thermal",
        name: "Thermal Physics",
        description: "Thermal expansion; calorimetry, latent heat; heat conduction; convection and radiation; ideal gas laws; specific heats; thermodynamic processes; Carnot engine; blackbody radiation.",
        subtopics: [
          { code: "phy.th.expansion", name: "Thermal Expansion and Calorimetry", description: "Expansion of solids/liquids/gases; latent heat; heat conduction in 1D; Newton's law of cooling." },
          { code: "phy.th.gas_laws", name: "Ideal Gas Laws", description: "Specific heats Cv and Cp for monoatomic and diatomic gases; isothermal and adiabatic processes; bulk modulus of gases." },
          { code: "phy.th.thermodynamics", name: "Thermodynamics", description: "First law and applications (ideal gases only); second law; reversible and irreversible processes; Carnot engine and efficiency." },
          { code: "phy.th.radiation", name: "Blackbody Radiation", description: "Absorptive and emissive powers; Kirchhoff's law; Wien's displacement law; Stefan's law." },
        ],
      },
      {
        code: "phy.em",
        name: "Electricity and Magnetism",
        description: "Coulomb's law; electric field, potential and capacitance; current electricity; magnetic effects of current; electromagnetic induction; AC and DC circuits.",
        subtopics: [
          { code: "phy.em.electrostatics", name: "Electrostatics", description: "Coulomb's law; field and potential; PE of point charges and dipoles; field lines; flux; Gauss's law and applications." },
          { code: "phy.em.capacitance", name: "Capacitance", description: "Parallel plate capacitor with/without dielectric; series and parallel; energy stored." },
          { code: "phy.em.current", name: "Current Electricity", description: "Ohm's law; series and parallel resistances and cells; Kirchhoff's laws; heating effect." },
          { code: "phy.em.magnetic", name: "Magnetic Effects", description: "Biot-Savart and Ampere's laws; field due to straight wire, circular coil, solenoid; force on moving charge and current-carrying wire." },
          { code: "phy.em.galvanometer", name: "Galvanometer and Loop", description: "Magnetic moment of current loop; effect of uniform field on loop; moving coil galvanometer, voltmeter, ammeter conversions." },
          { code: "phy.em.induction", name: "Electromagnetic Induction", description: "Faraday's law; Lenz's law; self and mutual inductance; RC, LR, LC and LCR series circuits with DC and AC sources." },
        ],
      },
      {
        code: "phy.em_waves",
        name: "Electromagnetic Waves",
        description: "Electromagnetic waves and their characteristics; electromagnetic spectrum and elementary facts about uses of radio waves, microwaves, infrared, visible, UV, X-rays, gamma rays.",
        subtopics: [
          { code: "phy.emw.characteristics", name: "Characteristics of EM Waves", description: "Transverse nature; speed in vacuum." },
          { code: "phy.emw.spectrum", name: "EM Spectrum", description: "Radio waves, microwaves, infrared, visible, UV, X-rays, gamma rays — uses." },
        ],
      },
      {
        code: "phy.optics",
        name: "Optics",
        description: "Geometrical optics — reflection, refraction, lenses, prisms; wave optics — Huygens' principle, interference (Young's double slit), diffraction (single slit), polarisation.",
        subtopics: [
          { code: "phy.opt.geometrical", name: "Geometrical Optics", description: "Rectilinear propagation; reflection and refraction at plane and spherical surfaces; total internal reflection; deviation and dispersion by prism; thin lenses; combinations of mirrors and lenses; magnification." },
          { code: "phy.opt.wave_huygens", name: "Wave Optics — Huygens' Principle", description: "Wavefront; interference limited to Young's double slit experiment." },
          { code: "phy.opt.diffraction", name: "Diffraction", description: "Diffraction due to single slit." },
          { code: "phy.opt.polarisation", name: "Polarisation", description: "Plane polarised light; Brewster's law; Polaroids." },
        ],
      },
      {
        code: "phy.modern",
        name: "Modern Physics",
        description: "Atomic nucleus and radioactivity; binding energy; fission and fusion; photoelectric effect; Bohr's theory of hydrogen-like atoms; X-rays; matter waves.",
        subtopics: [
          { code: "phy.mod.nucleus", name: "Atomic Nucleus", description: "Alpha, beta and gamma radiations; law of radioactive decay; decay constant; half-life and mean life; binding energy; fission and fusion energy calculations." },
          { code: "phy.mod.photoelectric", name: "Photoelectric Effect", description: "Einstein's equation; threshold frequency; stopping potential." },
          { code: "phy.mod.bohr", name: "Bohr Model of Hydrogen-like Atoms", description: "Energy levels, spectrum lines, ionization energy." },
          { code: "phy.mod.xrays", name: "X-rays", description: "Characteristic and continuous X-rays; Moseley's law." },
          { code: "phy.mod.matter_waves", name: "Matter Waves", description: "de Broglie wavelength of matter waves." },
        ],
      },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      // Physical
      {
        code: "chem.general",
        name: "General Topics",
        description: "Concept of atoms and molecules; Dalton's atomic theory; mole concept; chemical formulae; balanced equations; stoichiometric calculations; concentration in mole fraction, molarity, molality and normality.",
        subtopics: [
          { code: "chem.gen.mole", name: "Mole Concept and Stoichiometry", description: "Mole-mass-volume relations; oxidation-reduction, neutralisation, displacement reaction calculations." },
          { code: "chem.gen.concentration", name: "Concentration Terms", description: "Mole fraction, molarity, molality, normality." },
        ],
      },
      {
        code: "chem.gases_liquids",
        name: "States of Matter: Gases and Liquids",
        description: "Gas laws and ideal gas equation; deviation from ideality, van der Waals equation; kinetic theory of gases; rms, average and most probable velocities; Dalton's law of partial pressures; diffusion; intermolecular interactions; liquids — vapour pressure, surface tension, viscosity.",
        subtopics: [
          { code: "chem.gl.gases", name: "Gases", description: "Gas laws; ideal and real gases; van der Waals equation; kinetic theory; types of velocities; partial pressures; diffusion." },
          { code: "chem.gl.liquids", name: "Liquids", description: "Vapour pressure, surface tension, viscosity; intermolecular interactions." },
        ],
      },
      {
        code: "chem.atomic",
        name: "Atomic Structure",
        description: "Bohr model; spectrum of hydrogen atom; wave-particle duality; de Broglie hypothesis; uncertainty principle; quantum mechanical picture of hydrogen atom — energies, quantum numbers, probability density, shapes of s, p and d orbitals; Aufbau principle; Pauli's exclusion principle and Hund's rule.",
        subtopics: [
          { code: "chem.atom.bohr", name: "Bohr Model and Hydrogen Spectrum", description: "Bohr's postulates; line spectrum of hydrogen atom." },
          { code: "chem.atom.duality", name: "Wave-Particle Duality", description: "de Broglie hypothesis; Heisenberg uncertainty principle." },
          { code: "chem.atom.qm", name: "Quantum Mechanical Picture", description: "Energies, quantum numbers, probability density (plots only); shapes of s, p, d orbitals." },
          { code: "chem.atom.config", name: "Aufbau, Pauli, Hund", description: "Electronic configuration of elements." },
        ],
      },
      {
        code: "chem.bonding",
        name: "Chemical Bonding and Molecular Structure",
        description: "Orbital overlap and covalent bond; hybridisation involving s, p and d orbitals only; molecular orbital energy diagrams for homonuclear diatomic species (up to Ne2); hydrogen bond; polarity; dipole moment; VSEPR model and shapes of molecules.",
        subtopics: [
          { code: "chem.bond.covalent", name: "Covalent Bond and Hybridisation", description: "Orbital overlap; sp, sp2, sp3, sp3d, sp3d2 hybridisation." },
          { code: "chem.bond.mot", name: "Molecular Orbital Theory", description: "MO diagrams for homonuclear diatomics up to Ne2; bond order." },
          { code: "chem.bond.polarity", name: "Polarity and Hydrogen Bonding", description: "Dipole moment; hydrogen bond." },
          { code: "chem.bond.vsepr", name: "VSEPR and Shapes", description: "Linear, angular, triangular, square planar, pyramidal, square pyramidal, trigonal bipyramidal, tetrahedral, octahedral." },
        ],
      },
      {
        code: "chem.thermodynamics",
        name: "Chemical Thermodynamics",
        description: "Intensive and extensive properties; state functions; first law; internal energy, work (PV only) and heat; enthalpy; heat capacity; standard state; Hess's law; enthalpy of reaction, fusion, vaporization, lattice enthalpy; second law; entropy; Gibbs energy; criteria of equilibrium and spontaneity.",
        subtopics: [
          { code: "chem.thermo.first", name: "First Law", description: "State functions; internal energy, work, heat; enthalpy; heat capacity." },
          { code: "chem.thermo.thermochem", name: "Thermochemistry", description: "Hess's law; enthalpies of reaction, fusion, vaporization, lattice." },
          { code: "chem.thermo.second", name: "Second Law", description: "Entropy; Gibbs energy; criteria of equilibrium and spontaneity." },
        ],
      },
      {
        code: "chem.equilibrium",
        name: "Chemical and Ionic Equilibrium",
        description: "Law of mass action; significance of ΔG and ΔG° in chemical equilibrium; Kp and Kc; reaction quotient; Le Chatelier's principle; solubility product; common ion effect; pH and buffer solutions; acids and bases (Bronsted and Lewis concepts); hydrolysis of salts.",
        subtopics: [
          { code: "chem.eq.chemical", name: "Chemical Equilibrium", description: "Kp, Kc, Q, Le Chatelier's principle." },
          { code: "chem.eq.acids_bases", name: "Acids, Bases and pH", description: "Bronsted and Lewis acids/bases; pH; buffer solutions." },
          { code: "chem.eq.solubility", name: "Solubility Product and Hydrolysis", description: "Ksp, common ion effect; hydrolysis of salts." },
        ],
      },
      {
        code: "chem.electrochem",
        name: "Electrochemistry",
        description: "Electrochemical cells and cell reactions; standard electrode potentials; Nernst equation; electrochemical series; emf; Faraday's laws of electrolysis; electrolytic conductance — specific, equivalent and molar conductivity; Kohlrausch's law; primary and secondary batteries; fuel cells; corrosion.",
        subtopics: [
          { code: "chem.elec.cells", name: "Galvanic Cells", description: "Cell reactions; standard electrode potentials; Nernst equation; electrochemical series." },
          { code: "chem.elec.electrolysis", name: "Electrolysis", description: "Faraday's laws; electrolytic conductance; Kohlrausch's law." },
          { code: "chem.elec.batteries", name: "Batteries, Fuel Cells, Corrosion", description: "Primary and secondary cells; fuel cells; corrosion." },
        ],
      },
      {
        code: "chem.kinetics",
        name: "Chemical Kinetics",
        description: "Rates of reactions; order and molecularity; rate law, rate constant, half-life; differential and integrated rate expressions for zero and first order; Arrhenius equation, activation energy; homogeneous and heterogeneous catalysis; enzyme catalysis.",
        subtopics: [
          { code: "chem.kin.rate", name: "Rate Law", description: "Order, molecularity, rate constant, half-life." },
          { code: "chem.kin.integrated", name: "Integrated Rate Expressions", description: "Zero and first order reactions." },
          { code: "chem.kin.arrhenius", name: "Arrhenius Equation", description: "Temperature dependence; activation energy." },
          { code: "chem.kin.catalysis", name: "Catalysis", description: "Homogeneous, heterogeneous; enzyme catalysis and mechanism." },
        ],
      },
      {
        code: "chem.solid_state",
        name: "Solid State",
        description: "Classification of solids; crystalline state; seven crystal systems with cell parameters; close packed structures (cubic and hexagonal); packing in fcc, bcc and hcp lattices; nearest neighbours; ionic radii and radius ratio; point defects.",
        subtopics: [
          { code: "chem.ss.classification", name: "Classification and Crystal Systems", description: "Seven crystal systems; cell parameters a, b, c, α, β, γ." },
          { code: "chem.ss.packing", name: "Close Packing", description: "fcc, bcc, hcp; coordination number; packing efficiency." },
          { code: "chem.ss.defects", name: "Defects and Radius Ratio", description: "Point defects; ionic radii; radius ratio rules." },
        ],
      },
      {
        code: "chem.solutions",
        name: "Solutions",
        description: "Henry's law; Raoult's law; ideal solutions; colligative properties — lowering of vapour pressure, elevation of boiling point, depression of freezing point, osmotic pressure; van't Hoff factor.",
        subtopics: [
          { code: "chem.sol.raoult", name: "Henry's and Raoult's Laws", description: "Ideal solutions; deviations." },
          { code: "chem.sol.colligative", name: "Colligative Properties", description: "Vapour pressure lowering, ΔTb, ΔTf, osmotic pressure; van't Hoff factor." },
        ],
      },
      {
        code: "chem.surface",
        name: "Surface Chemistry",
        description: "Elementary concepts of adsorption — physisorption and chemisorption; Freundlich adsorption isotherm; colloids — types, methods of preparation and general properties; emulsions, surfactants and micelles (definitions and examples).",
        subtopics: [
          { code: "chem.sur.adsorption", name: "Adsorption", description: "Physisorption vs chemisorption; Freundlich isotherm." },
          { code: "chem.sur.colloids", name: "Colloids", description: "Types, methods of preparation, general properties." },
          { code: "chem.sur.emulsions", name: "Emulsions and Micelles", description: "Surfactants, micelles — definitions and examples." },
        ],
      },
      // Inorganic
      {
        code: "chem.periodicity",
        name: "Classification of Elements and Periodicity in Properties",
        description: "Modern periodic law and present form of periodic table; electronic configuration; periodic trends in atomic and ionic radii, ionisation enthalpy, electron gain enthalpy, valence, oxidation states, electronegativity, chemical reactivity.",
        subtopics: [
          { code: "chem.per.law", name: "Modern Periodic Law", description: "Long form of periodic table; electronic configuration." },
          { code: "chem.per.trends", name: "Periodic Trends", description: "Atomic radius, IE, EA, electronegativity, valence, oxidation states." },
        ],
      },
      {
        code: "chem.hydrogen",
        name: "Hydrogen",
        description: "Position in periodic table; occurrence, isotopes, preparation, properties and uses; hydrides — ionic, covalent, interstitial; physical and chemical properties of water and heavy water; hydrogen peroxide — preparation, reactions, structure and uses; hydrogen as a fuel.",
        subtopics: [
          { code: "chem.h.position", name: "Position and Isotopes", description: "Anomalous position; protium, deuterium, tritium." },
          { code: "chem.h.hydrides", name: "Hydrides", description: "Ionic, covalent and interstitial hydrides." },
          { code: "chem.h.water", name: "Water and Heavy Water", description: "Physical and chemical properties." },
          { code: "chem.h.h2o2", name: "Hydrogen Peroxide", description: "Preparation, structure, reactions and uses." },
        ],
      },
      {
        code: "chem.s_block",
        name: "s-Block Elements",
        description: "Alkali and alkaline earth metals — reactivity towards air, water, dihydrogen, halogens, acids; reducing nature; uses; general characteristics of oxides, hydroxides, halides, oxoacid salts; anomalous behaviour of Li and Be; preparation, properties and uses of compounds of sodium (Na2CO3, NaCl, NaOH, NaHCO3) and calcium (CaO, Ca(OH)2, CaCO3, CaSO4).",
        subtopics: [
          { code: "chem.sb.alkali", name: "Alkali Metals", description: "Group 1 reactivity; solutions in liquid ammonia; uses." },
          { code: "chem.sb.alkaline_earth", name: "Alkaline Earth Metals", description: "Group 2 trends and reactivity." },
          { code: "chem.sb.anomalous", name: "Anomalous Behaviour", description: "Lithium and beryllium — diagonal relationship." },
          { code: "chem.sb.compounds", name: "Important Compounds", description: "Sodium and calcium compounds — preparation, properties, uses." },
        ],
      },
      {
        code: "chem.p_block",
        name: "p-Block Elements",
        description: "Oxidation states and trends in chemical reactivity of groups 13-17; anomalous properties of B, C, N, O, F; group-wise study of preparation, properties and uses of important compounds.",
        subtopics: [
          { code: "chem.pb.group13", name: "Group 13", description: "Reactivity towards acids, alkalis, halogens; borax, orthoboric acid, diborane, BF3, AlCl3, alums; uses of B and Al." },
          { code: "chem.pb.group14", name: "Group 14", description: "Allotropes of carbon; CO, CO2, SiO2, silicones, silicates, zeolites." },
          { code: "chem.pb.group15", name: "Group 15", description: "Allotropes of P; dinitrogen, ammonia, HNO3, phosphine, PCl3, PCl5; oxides of N; oxoacids of P." },
          { code: "chem.pb.group16", name: "Group 16", description: "Allotropes of S; dioxygen, ozone, SO2, H2SO4; oxoacids of sulphur." },
          { code: "chem.pb.group17", name: "Group 17", description: "Chlorine, HCl, interhalogens; oxoacids of halogens; bleaching powder." },
          { code: "chem.pb.group18", name: "Group 18", description: "Chemical properties; xenon fluorides and oxides." },
        ],
      },
      {
        code: "chem.d_block",
        name: "d-Block Elements",
        description: "Oxidation states and stability; standard electrode potentials; interstitial compounds; alloys; catalytic properties; applications; preparation, structure and reactions of oxoanions of chromium and manganese.",
        subtopics: [
          { code: "chem.db.general", name: "General Properties", description: "Oxidation states, electrode potentials, alloys, catalytic properties, interstitial compounds." },
          { code: "chem.db.oxoanions", name: "Oxoanions of Cr and Mn", description: "K2Cr2O7 and KMnO4 — preparation, structure, reactions." },
        ],
      },
      {
        code: "chem.f_block",
        name: "f-Block Elements",
        description: "Lanthanoid and actinoid contractions; oxidation states; general characteristics.",
        subtopics: [
          { code: "chem.fb.lanthanoids", name: "Lanthanoids", description: "Lanthanoid contraction; oxidation states; general characteristics." },
          { code: "chem.fb.actinoids", name: "Actinoids", description: "Actinoid contraction; oxidation states; comparison with lanthanoids." },
        ],
      },
      {
        code: "chem.coordination",
        name: "Coordination Compounds",
        description: "Werner's theory; nomenclature; cis-trans and ionisation isomerism; hybridisation and geometries (linear, tetrahedral, square planar and octahedral) of mononuclear complexes; bonding — VBT and CFT (octahedral and tetrahedral fields); magnetic properties (spin-only) and colour of 3d-series; ligands and spectrochemical series; stability; importance and applications; metal carbonyls.",
        subtopics: [
          { code: "chem.coord.werner", name: "Werner's Theory and Nomenclature", description: "Primary and secondary valencies; IUPAC nomenclature." },
          { code: "chem.coord.isomerism", name: "Isomerism", description: "Cis-trans and ionisation isomerism." },
          { code: "chem.coord.bonding", name: "Bonding (VBT and CFT)", description: "Hybridisation; CFT for octahedral and tetrahedral fields; spectrochemical series; spin-only magnetic moment." },
          { code: "chem.coord.applications", name: "Applications", description: "Metal carbonyls; importance in qualitative analysis, biology and medicine." },
        ],
      },
      {
        code: "chem.metallurgy",
        name: "Isolation of Metals",
        description: "Metal ores and concentration; extraction of crude metal — thermodynamic principles (iron, copper, zinc) and electrochemical principles (aluminium); cyanide process for silver and gold; refining methods.",
        subtopics: [
          { code: "chem.met.ores", name: "Concentration of Ores", description: "Physical and chemical methods of concentration." },
          { code: "chem.met.extraction", name: "Extraction", description: "Thermodynamic (Fe, Cu, Zn) and electrochemical (Al) principles; cyanide process (Ag, Au)." },
          { code: "chem.met.refining", name: "Refining", description: "Distillation, liquation, electrolytic, zone refining, vapour phase refining." },
        ],
      },
      {
        code: "chem.qual_analysis",
        name: "Principles of Qualitative Analysis",
        description: "Cation analysis Groups I to V (only Ag+, Hg2+, Cu2+, Pb2+, Fe3+, Cr3+, Al3+, Ca2+, Ba2+, Zn2+, Mn2+, Mg2+); anion analysis — nitrate, halides (excluding fluoride), carbonate, bicarbonate, sulphate, sulphide.",
        subtopics: [
          { code: "chem.qa.cations", name: "Cation Analysis", description: "Groups I to V wet tests for the listed metal ions." },
          { code: "chem.qa.anions", name: "Anion Analysis", description: "Tests for nitrate, chloride, bromide, iodide, carbonate, sulphate, sulphide." },
        ],
      },
      {
        code: "chem.environmental",
        name: "Environmental Chemistry",
        description: "Atmospheric pollution; water pollution; soil pollution; industrial waste; strategies to control environmental pollution; green chemistry.",
        subtopics: [
          { code: "chem.env.air", name: "Atmospheric Pollution", description: "Tropospheric and stratospheric pollution; smog; ozone depletion; greenhouse effect." },
          { code: "chem.env.water_soil", name: "Water and Soil Pollution", description: "Sources and effects; industrial waste." },
          { code: "chem.env.green", name: "Green Chemistry", description: "Strategies to control pollution; green chemistry principles." },
        ],
      },
      // Organic
      {
        code: "chem.org_basics",
        name: "Basic Principles of Organic Chemistry",
        description: "Hybridisation of carbon; sigma and pi bonds; shapes of organic molecules; aromaticity; structural and geometrical isomerism; stereoisomerism (enantiomers, diastereomers, meso) up to two asymmetric centres (R/S and E/Z excluded); empirical and molecular formulae by combustion; IUPAC nomenclature (hydrocarbons, mono- and bi-functional derivatives); inductive, resonance and hyperconjugative effects; acidity and basicity of organic compounds; reactive intermediates — carbocations, carbanions, free radicals.",
        subtopics: [
          { code: "chem.ob.hybrid", name: "Hybridisation and Aromaticity", description: "Hybridisation of carbon; aromaticity (Hückel's rule)." },
          { code: "chem.ob.isomerism", name: "Isomerism and Stereochemistry", description: "Structural, geometrical, optical isomerism; enantiomers, diastereomers, meso compounds." },
          { code: "chem.ob.iupac", name: "IUPAC Nomenclature", description: "Hydrocarbons including simple cyclic and mono-/bi-functional derivatives." },
          { code: "chem.ob.effects", name: "Electronic Effects", description: "Inductive, resonance, hyperconjugation; acidity and basicity." },
          { code: "chem.ob.intermediates", name: "Reactive Intermediates", description: "Formation, structure and stability of carbocations, carbanions, free radicals." },
          { code: "chem.ob.empirical", name: "Empirical and Molecular Formulae", description: "Determination by combustion method." },
        ],
      },
      {
        code: "chem.alkanes",
        name: "Alkanes",
        description: "Homologous series; physical properties and effect of branching; conformations of ethane and butane (Newman projections only); preparation from alkyl halides and aliphatic carboxylic acids; reactions — combustion, halogenation (allylic, benzylic) and oxidation.",
        subtopics: [
          { code: "chem.alk.physical", name: "Physical Properties", description: "Melting points, boiling points, density; effect of branching." },
          { code: "chem.alk.conformations", name: "Conformations", description: "Newman projections of ethane and butane." },
          { code: "chem.alk.preparation", name: "Preparation", description: "From alkyl halides and aliphatic carboxylic acids." },
          { code: "chem.alk.reactions", name: "Reactions", description: "Combustion, halogenation (incl. allylic and benzylic), oxidation." },
        ],
      },
      {
        code: "chem.alkenes_alkynes",
        name: "Alkenes and Alkynes",
        description: "Physical properties; preparation by elimination; acid-catalysed hydration (excl. stereochemistry); metal acetylides; reactions of alkenes with KMnO4 and ozone; reduction; electrophilic addition with X2, HX, HOX; effect of peroxide; cyclic polymerisation of alkynes.",
        subtopics: [
          { code: "chem.aa.preparation", name: "Preparation", description: "By elimination reactions." },
          { code: "chem.aa.addition", name: "Addition Reactions", description: "Hydration (acid-catalysed); X2, HX, HOX additions; peroxide effect; reduction." },
          { code: "chem.aa.oxidation", name: "Oxidation", description: "Reactions with KMnO4 and ozone." },
          { code: "chem.aa.acetylides", name: "Metal Acetylides and Polymerisation", description: "Acidity of terminal alkynes; cyclic polymerisation." },
        ],
      },
      {
        code: "chem.benzene",
        name: "Benzene",
        description: "Structure; electrophilic substitution reactions — halogenation, nitration, sulphonation, Friedel-Crafts alkylation and acylation; effect of directing groups in monosubstituted benzene.",
        subtopics: [
          { code: "chem.benz.structure", name: "Structure of Benzene", description: "Kekulé structure, resonance, aromatic character." },
          { code: "chem.benz.eas", name: "Electrophilic Substitution", description: "Halogenation, nitration, sulphonation, Friedel-Crafts alkylation and acylation." },
          { code: "chem.benz.directing", name: "Directing Groups", description: "Ortho/para and meta directors in monosubstituted benzene." },
        ],
      },
      {
        code: "chem.phenols",
        name: "Phenols",
        description: "Physical properties; preparation; electrophilic substitution (halogenation, nitration, sulphonation); Reimer-Tiemann reaction; Kolbe reaction; esterification; etherification; aspirin synthesis; oxidation and reduction of phenol.",
        subtopics: [
          { code: "chem.ph.preparation", name: "Preparation", description: "From cumene, diazonium salts, chlorobenzene." },
          { code: "chem.ph.eas", name: "Electrophilic Substitution", description: "Halogenation, nitration, sulphonation." },
          { code: "chem.ph.named", name: "Named Reactions", description: "Reimer-Tiemann, Kolbe; aspirin synthesis." },
        ],
      },
      {
        code: "chem.alkyl_halides",
        name: "Alkyl Halides",
        description: "Rearrangement reactions of alkyl carbocations; Grignard reactions; nucleophilic substitution and stereochemical aspects.",
        subtopics: [
          { code: "chem.ah.grignard", name: "Grignard Reactions", description: "Preparation and reactions of Grignard reagents." },
          { code: "chem.ah.snreactions", name: "Nucleophilic Substitution", description: "SN1, SN2 mechanisms; stereochemical aspects; carbocation rearrangements." },
        ],
      },
      {
        code: "chem.alcohols",
        name: "Alcohols",
        description: "Physical properties; reactions — esterification; dehydration (formation of alkenes and ethers); reactions with sodium, phosphorus halides, ZnCl2/conc HCl, thionyl chloride; conversion to aldehydes, ketones and carboxylic acids.",
        subtopics: [
          { code: "chem.alc.physical", name: "Physical Properties", description: "Boiling points, hydrogen bonding effects." },
          { code: "chem.alc.reactions", name: "Reactions", description: "Esterification, dehydration; reactions with Na, PX3/PX5, SOCl2, ZnCl2/HCl." },
          { code: "chem.alc.oxidation", name: "Oxidation", description: "Conversion to aldehydes, ketones, carboxylic acids." },
        ],
      },
      {
        code: "chem.ethers",
        name: "Ethers",
        description: "Preparation by Williamson's synthesis; C-O bond cleavage reactions.",
        subtopics: [
          { code: "chem.eth.williamson", name: "Williamson Synthesis", description: "Preparation of symmetric and unsymmetric ethers." },
          { code: "chem.eth.cleavage", name: "C-O Cleavage", description: "Cleavage by HX." },
        ],
      },
      {
        code: "chem.aldehydes_ketones",
        name: "Aldehydes and Ketones",
        description: "Preparation from acid chlorides, nitriles, esters; benzaldehyde from toluene and benzene; reactions — oxidation, reduction, oxime and hydrazone formation; aldol condensation, Cannizzaro reaction; haloform reaction; nucleophilic addition with RMgX, NaHSO3, HCN, alcohol, amine.",
        subtopics: [
          { code: "chem.ak.preparation", name: "Preparation", description: "From acid chlorides, nitriles, esters; benzaldehyde from toluene/benzene." },
          { code: "chem.ak.nucleophilic", name: "Nucleophilic Addition", description: "Addition with RMgX, NaHSO3, HCN, alcohol, amine." },
          { code: "chem.ak.named", name: "Named Reactions", description: "Aldol condensation, Cannizzaro, haloform reaction; oxime and hydrazone formation." },
          { code: "chem.ak.redox", name: "Oxidation and Reduction", description: "Tollens, Fehling, Clemmensen, Wolff-Kishner reductions." },
        ],
      },
      {
        code: "chem.carboxylic",
        name: "Carboxylic Acids",
        description: "Physical properties; preparation from nitriles, Grignard reagents, hydrolysis of esters and amides; preparation of benzoic acid from alkylbenzenes; reactions — reduction, halogenation; formation of esters, acid chlorides and amides.",
        subtopics: [
          { code: "chem.ca.preparation", name: "Preparation", description: "From nitriles, Grignard reagents, hydrolysis of esters/amides; benzoic acid from alkylbenzenes." },
          { code: "chem.ca.reactions", name: "Reactions", description: "Reduction, halogenation; formation of esters, acid chlorides and amides." },
        ],
      },
      {
        code: "chem.amines",
        name: "Amines",
        description: "Preparation from nitro compounds, nitriles and amides; reactions — Hoffmann bromamide degradation, Gabriel phthalimide synthesis; reaction with nitrous acid; azo coupling reactions of diazonium salts; Sandmeyer and related reactions; carbylamine reaction; Hinsberg test; alkylation and acylation reactions.",
        subtopics: [
          { code: "chem.am.preparation", name: "Preparation", description: "From nitro compounds, nitriles, amides; Hoffmann, Gabriel synthesis." },
          { code: "chem.am.diazonium", name: "Diazonium Salts", description: "Sandmeyer reaction; azo coupling; conversion to phenols, halides, cyanides." },
          { code: "chem.am.identification", name: "Identification", description: "Carbylamine reaction; Hinsberg test." },
        ],
      },
      {
        code: "chem.haloarenes",
        name: "Haloarenes",
        description: "Reactions — Fittig and Wurtz-Fittig; nucleophilic aromatic substitution (excluding benzyne mechanism and cine substitution).",
        subtopics: [
          { code: "chem.ha.fittig", name: "Fittig and Wurtz-Fittig", description: "Coupling reactions of haloarenes." },
          { code: "chem.ha.nas", name: "Nucleophilic Aromatic Substitution", description: "On haloarenes and substituted haloarenes." },
        ],
      },
      {
        code: "chem.biomolecules",
        name: "Biomolecules",
        description: "Carbohydrates — classification; mono- and disaccharides (glucose and sucrose); oxidation, reduction; glycoside formation and hydrolysis (sucrose, maltose, lactose); anomers. Proteins — amino acids; peptide linkage; primary and secondary structure; fibrous and globular proteins. Nucleic acids — chemical composition and structure of DNA and RNA.",
        subtopics: [
          { code: "chem.bio.carbohydrates", name: "Carbohydrates", description: "Mono-/disaccharides; glucose, sucrose; anomers; glycoside formation/hydrolysis." },
          { code: "chem.bio.proteins", name: "Proteins", description: "Amino acids; peptide linkage; primary and secondary structures; fibrous and globular proteins." },
          { code: "chem.bio.nucleic", name: "Nucleic Acids", description: "Chemical composition and structure of DNA and RNA." },
        ],
      },
      {
        code: "chem.polymers",
        name: "Polymers",
        description: "Types of polymerisation (addition, condensation); homo- and copolymers; natural rubber; cellulose; nylon; Teflon; bakelite; PVC; biodegradable polymers; applications.",
        subtopics: [
          { code: "chem.pol.types", name: "Types of Polymerisation", description: "Addition and condensation polymerisation." },
          { code: "chem.pol.examples", name: "Important Polymers", description: "Natural rubber, cellulose, nylon, Teflon, bakelite, PVC; biodegradable polymers." },
        ],
      },
      {
        code: "chem.everyday_life",
        name: "Chemistry in Everyday Life",
        description: "Drug-target interaction; therapeutic action and examples (excluding structures) of antacids, antihistamines, tranquilizers, analgesics, antimicrobials, antifertility drugs; artificial sweeteners (names only); soaps and detergents and cleansing action.",
        subtopics: [
          { code: "chem.el.drugs", name: "Drugs and Therapeutic Action", description: "Antacids, antihistamines, tranquilizers, analgesics, antimicrobials, antifertility drugs." },
          { code: "chem.el.cleansing", name: "Soaps and Detergents", description: "Cleansing action; artificial sweeteners." },
        ],
      },
      {
        code: "chem.practical_organic",
        name: "Practical Organic Chemistry",
        description: "Detection of elements (N, S, halogens); detection and identification of functional groups — hydroxyl (alcoholic and phenolic), carbonyl (aldehyde and ketone), carboxyl, amino and nitro.",
        subtopics: [
          { code: "chem.po.elements", name: "Detection of Elements", description: "Lassaigne's test for N, S, halogens." },
          { code: "chem.po.functional", name: "Detection of Functional Groups", description: "Hydroxyl, carbonyl, carboxyl, amino, nitro." },
        ],
      },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      {
        code: "math.sets_relations_functions",
        name: "Sets, Relations and Functions",
        description: "Sets, kinds of sets, algebra of sets, De-Morgan's laws; Cartesian product; relations, equivalence relations; functions, domain, codomain, range, invertible, even/odd, into/onto/one-to-one; special functions; sum, difference, product, composition.",
        subtopics: [
          { code: "math.srf.sets", name: "Sets", description: "Empty, finite, infinite sets; algebra of sets; De Morgan's laws; practical problems." },
          { code: "math.srf.relations", name: "Relations", description: "Cartesian product; ordered pairs; domain, codomain; equivalence relations." },
          { code: "math.srf.functions", name: "Functions", description: "One-to-one, onto, into; invertible; even/odd; special functions; composition." },
        ],
      },
      {
        code: "math.algebra",
        name: "Algebra",
        description: "Algebra of complex numbers; conjugation, polar representation, modulus, argument, triangle inequality, cube roots of unity; fundamental theorem of algebra (statement); quadratic equations with real coefficients; arithmetic and geometric progressions; means; sums of n natural numbers, squares and cubes; logarithms; permutations and combinations; binomial theorem for positive integral index.",
        subtopics: [
          { code: "math.alg.complex", name: "Complex Numbers", description: "Algebra; modulus, argument; polar form; cube roots of unity; geometric interpretations." },
          { code: "math.alg.quadratic", name: "Quadratic Equations", description: "Real coefficients; relations between roots and coefficients; symmetric functions of roots." },
          { code: "math.alg.progressions", name: "Arithmetic and Geometric Progressions", description: "AM, GM; sum of finite AP/GP; infinite GP." },
          { code: "math.alg.special_sums", name: "Special Sums", description: "Sn, Sn^2, Sn^3 of first n natural numbers." },
          { code: "math.alg.logarithms", name: "Logarithms", description: "Properties of logarithms." },
          { code: "math.alg.pnc", name: "Permutations and Combinations", description: "P(n,r), C(n,r); applications." },
          { code: "math.alg.binomial", name: "Binomial Theorem", description: "Positive integral index; properties of binomial coefficients." },
        ],
      },
      {
        code: "math.matrices",
        name: "Matrices",
        description: "Matrices as rectangular arrays; equality; addition; scalar multiplication; product; transpose; elementary row/column transformations; determinant of a square matrix of order up to three; adjoint; inverse; properties; diagonal, symmetric, skew-symmetric matrices; solution of simultaneous linear equations in two or three variables.",
        subtopics: [
          { code: "math.mat.algebra", name: "Algebra of Matrices", description: "Addition, scalar multiplication, multiplication; transpose." },
          { code: "math.mat.determinant", name: "Determinants and Inverse", description: "Determinant up to order 3; adjoint; inverse; properties." },
          { code: "math.mat.linear_eq", name: "Linear Equations", description: "Solution of systems in 2 or 3 variables using matrix/determinant methods." },
        ],
      },
      {
        code: "math.probability_statistics",
        name: "Probability and Statistics",
        description: "Random experiment; sample space; events (impossible, simple, compound); addition and multiplication rules; conditional probability; independence; total probability; Bayes' theorem; permutations and combinations in probability. Mean, median, mode; mean deviation, standard deviation, variance of grouped and ungrouped data; analysis of frequency distributions; random variables — mean and variance.",
        subtopics: [
          { code: "math.ps.probability", name: "Probability", description: "Sample space; events; addition/multiplication rules; conditional probability; independence." },
          { code: "math.ps.bayes", name: "Bayes' Theorem", description: "Total probability theorem; Bayes' theorem applications." },
          { code: "math.ps.statistics", name: "Statistics", description: "Mean, median, mode; mean deviation, SD, variance; frequency distributions." },
          { code: "math.ps.random_var", name: "Random Variables", description: "Mean and variance of random variables." },
        ],
      },
      {
        code: "math.trigonometry",
        name: "Trigonometry",
        description: "Trigonometric functions, periodicity and graphs; addition and subtraction formulae; multiple and sub-multiple angles; general solution of trigonometric equations; inverse trigonometric functions (principal value only) and their elementary properties.",
        subtopics: [
          { code: "math.trig.functions", name: "Trigonometric Functions", description: "Periodicity and graphs of all six trigonometric functions." },
          { code: "math.trig.identities", name: "Trigonometric Identities", description: "Addition, subtraction, multiple and sub-multiple angles." },
          { code: "math.trig.equations", name: "Trigonometric Equations", description: "General solutions." },
          { code: "math.trig.inverse", name: "Inverse Trigonometric Functions", description: "Principal values; elementary properties." },
        ],
      },
      {
        code: "math.analytical_geom_2d",
        name: "Analytical Geometry — Two Dimensions",
        description: "Cartesian coordinates; distance between two points; section formulae; shift of origin; equations of straight lines; angle between lines; distance of a point from a line; bisectors of angles; concurrency; centroid, orthocentre, incentre, circumcentre of a triangle; circle in various forms; tangents, normals, chords; conic sections — parabola, ellipse, hyperbola in standard form; locus problems.",
        subtopics: [
          { code: "math.ag2.lines", name: "Straight Lines", description: "Distance, section formulae, shift of origin; equations of lines; angle and distance; concurrency." },
          { code: "math.ag2.triangle_centres", name: "Triangle Centres", description: "Centroid, orthocentre, incentre, circumcentre." },
          { code: "math.ag2.circle", name: "Circle", description: "Equation in various forms; tangent, normal, chord; intersection with line/circle; family of circles." },
          { code: "math.ag2.parabola", name: "Parabola", description: "Standard equation; foci, directrix, eccentricity; parametric equations; tangent and normal." },
          { code: "math.ag2.ellipse", name: "Ellipse", description: "Standard equation; foci, directrices, eccentricity; tangent and normal." },
          { code: "math.ag2.hyperbola", name: "Hyperbola", description: "Standard equation; foci, directrices, eccentricity; tangent and normal." },
          { code: "math.ag2.locus", name: "Locus Problems", description: "Locus of a moving point under given conditions." },
        ],
      },
      {
        code: "math.analytical_geom_3d",
        name: "Analytical Geometry — Three Dimensions",
        description: "Distance between two points; direction cosines and direction ratios; equation of a straight line in space; skew lines; shortest distance; equation of a plane; distance of a point from a plane; angle between two lines, two planes, line and plane; coplanar lines.",
        subtopics: [
          { code: "math.ag3.basics", name: "Basics in 3D", description: "Distance between points; direction cosines and ratios." },
          { code: "math.ag3.line", name: "Equation of a Line", description: "Skew lines; shortest distance between two lines." },
          { code: "math.ag3.plane", name: "Equation of a Plane", description: "Distance of point from plane; angle between planes; coplanar lines." },
        ],
      },
      {
        code: "math.differential_calculus",
        name: "Differential Calculus",
        description: "Limit of a function; continuity; limit and continuity of sum, difference, product, quotient; L'Hopital's rule; continuity of composite functions; intermediate value property; derivatives — sum, difference, product, quotient, chain rule; derivatives of polynomial, rational, trigonometric, inverse trigonometric, exponential and logarithmic functions; tangents and normals; increasing and decreasing functions; derivatives of order two; maxima and minima; Rolle's and Lagrange's mean value theorems; derivatives of implicit functions up to order two.",
        subtopics: [
          { code: "math.dc.limits", name: "Limits", description: "Limit at a real number; algebra of limits; L'Hopital's rule." },
          { code: "math.dc.continuity", name: "Continuity", description: "Continuity of composite functions; intermediate value theorem." },
          { code: "math.dc.derivative", name: "Derivative", description: "Definition; sum, difference, product, quotient; chain rule; derivatives of standard functions." },
          { code: "math.dc.applications", name: "Applications of Derivatives", description: "Tangents, normals, monotonicity, maxima and minima; Rolle's and Lagrange's MVT." },
          { code: "math.dc.implicit", name: "Implicit and Higher-Order", description: "Derivatives of implicit functions up to order two." },
        ],
      },
      {
        code: "math.integral_calculus",
        name: "Integral Calculus",
        description: "Integration as inverse of differentiation; indefinite integrals of standard functions; definite integrals as the limit of sums; properties of definite integrals; fundamental theorem of integral calculus; integration by parts, substitution, partial fractions; areas bounded by simple curves. Differential equations — formation, solution of homogeneous DEs of first order and first degree; separation of variables; linear first order DEs.",
        subtopics: [
          { code: "math.ic.indefinite", name: "Indefinite Integrals", description: "Standard integrals; substitution, by parts, partial fractions." },
          { code: "math.ic.definite", name: "Definite Integrals", description: "Definite integral as limit of sums; properties; fundamental theorem of integral calculus." },
          { code: "math.ic.area", name: "Area Under Curves", description: "Application of definite integrals to areas bounded by simple curves." },
          { code: "math.ic.differential_eq", name: "Differential Equations", description: "Formation; homogeneous; separation of variables; linear first order DE." },
        ],
      },
      {
        code: "math.vectors",
        name: "Vectors",
        description: "Addition of vectors; scalar multiplication; dot and cross products; scalar and vector triple products; geometrical interpretations.",
        subtopics: [
          { code: "math.vec.algebra", name: "Algebra of Vectors", description: "Addition, scalar multiplication." },
          { code: "math.vec.products", name: "Dot and Cross Products", description: "Scalar and vector products and their geometric interpretations." },
          { code: "math.vec.triple", name: "Triple Products", description: "Scalar triple product; vector triple product." },
        ],
      },
    ],
  },
];

export async function seedJeeAdvancedSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JEE_ADVANCED" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JEE_ADVANCED exam not found.");
  }
  console.log(`Seeding JEE Advanced syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jeeAdvancedSyllabus.length; sIdx++) {
    const s = jeeAdvancedSyllabus[sIdx];
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      update: { name: s.name, weight: s.weight, orderIdx: sIdx },
      create: {
        examId: exam.id,
        code: s.code,
        name: s.name,
        weight: s.weight,
        orderIdx: sIdx,
      },
    });

    for (let tIdx = 0; tIdx < s.topics.length; tIdx++) {
      const t = s.topics[tIdx];
      const topic = await prisma.topic.upsert({
        where: { subjectId_code: { subjectId: subject.id, code: t.code } },
        update: {
          name: t.name,
          description: t.description ?? null,
          syllabusText: t.description ?? null,
          weight: t.weight ?? 1,
          orderIdx: tIdx,
          parentId: null,
        },
        create: {
          subjectId: subject.id,
          code: t.code,
          name: t.name,
          description: t.description ?? null,
          syllabusText: t.description ?? null,
          weight: t.weight ?? 1,
          orderIdx: tIdx,
        },
      });
      topicCount++;

      if (t.subtopics?.length) {
        for (let stIdx = 0; stIdx < t.subtopics.length; stIdx++) {
          const st = t.subtopics[stIdx];
          await prisma.topic.upsert({
            where: { subjectId_code: { subjectId: subject.id, code: st.code } },
            update: {
              name: st.name,
              description: st.description ?? null,
              syllabusText: st.description ?? null,
              parentId: topic.id,
              orderIdx: stIdx,
            },
            create: {
              subjectId: subject.id,
              parentId: topic.id,
              code: st.code,
              name: st.name,
              description: st.description ?? null,
              syllabusText: st.description ?? null,
              orderIdx: stIdx,
            },
          });
          topicCount++;
        }
      }
    }
    console.log(`  ✓ ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedJeeAdvancedSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
