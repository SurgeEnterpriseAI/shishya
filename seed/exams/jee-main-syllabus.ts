// JEE Main 2026 — full syllabus tree as published by NTA on jeemain.nta.nic.in.
// Paper 1 (B.E./B.Tech): Physics + Chemistry + Mathematics, 90 questions, 300 marks.
// Source: NTA JEE Main 2026 Information Bulletin / Syllabus PDF.
//
// Run after seedExams: npx tsx seed/exams/jee-main-syllabus.ts

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

export const jeeMainSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      {
        code: "phy.units_measurement",
        name: "Physics and Measurement",
        description: "Units of measurements; SI units, fundamental and derived units; least count, accuracy and precision; significant figures; dimensional analysis and its applications.",
        subtopics: [
          { code: "phy.units_measurement.units", name: "Units and Dimensions", description: "SI base and derived units; dimensional formulae and homogeneity." },
          { code: "phy.units_measurement.errors", name: "Errors in Measurement", description: "Absolute, relative and percentage errors; combination of errors." },
          { code: "phy.units_measurement.sig_fig", name: "Significant Figures", description: "Rules for counting significant figures and rounding off." },
        ],
      },
      {
        code: "phy.kinematics",
        name: "Kinematics",
        description: "Frame of reference; motion in a straight line; uniform and non-uniform motion; scalars and vectors; vector addition and subtraction; motion in a plane; projectile motion; uniform circular motion.",
        subtopics: [
          { code: "phy.kinematics.1d", name: "Motion in a Straight Line", description: "Position-time graphs, average and instantaneous velocity and acceleration; equations of uniformly accelerated motion." },
          { code: "phy.kinematics.vectors", name: "Scalars and Vectors", description: "Vector addition, multiplication by a scalar, dot and cross product, resolution of vectors." },
          { code: "phy.kinematics.2d", name: "Motion in a Plane", description: "Position vector, displacement, velocity and acceleration in 2D." },
          { code: "phy.kinematics.projectile", name: "Projectile Motion", description: "Time of flight, range and maximum height; trajectory equation." },
          { code: "phy.kinematics.circular", name: "Uniform Circular Motion", description: "Angular velocity, centripetal acceleration." },
        ],
      },
      {
        code: "phy.laws_motion",
        name: "Laws of Motion",
        description: "Newton's three laws of motion; conservation of linear momentum and its applications; equilibrium of concurrent forces; static and kinetic friction; dynamics of uniform circular motion: centripetal force.",
        subtopics: [
          { code: "phy.laws_motion.newton", name: "Newton's Laws", description: "Force, inertia, momentum, action and reaction." },
          { code: "phy.laws_motion.friction", name: "Friction", description: "Static, kinetic and rolling friction; laws of friction; angle of friction and repose." },
          { code: "phy.laws_motion.circular_dyn", name: "Circular Motion Dynamics", description: "Centripetal force; vehicle on level circular road; banking of roads." },
        ],
      },
      {
        code: "phy.work_energy_power",
        name: "Work, Energy and Power",
        description: "Work done by a constant and variable force; kinetic and potential energies; work-energy theorem; power; conservative and non-conservative forces; elastic and inelastic collisions in one and two dimensions.",
        subtopics: [
          { code: "phy.wep.work", name: "Work and Energy", description: "Work done, kinetic energy, work-energy theorem." },
          { code: "phy.wep.pe", name: "Potential Energy", description: "Gravitational and elastic PE; conservative forces." },
          { code: "phy.wep.power", name: "Power", description: "Average and instantaneous power." },
          { code: "phy.wep.collisions", name: "Collisions", description: "Elastic and inelastic collisions in 1D and 2D; coefficient of restitution." },
        ],
      },
      {
        code: "phy.rotational",
        name: "Rotational Motion",
        description: "Centre of mass of a two-particle system, of a rigid body; basic concepts of rotational motion; moment of a force, torque, angular momentum; conservation of angular momentum; moment of inertia; parallel and perpendicular axes theorems; equations of rotational motion; rolling motion.",
        subtopics: [
          { code: "phy.rot.com", name: "Centre of Mass", description: "Position and motion of CoM; CoM of system of particles and rigid bodies." },
          { code: "phy.rot.torque", name: "Torque and Angular Momentum", description: "Moment of force; angular momentum and its conservation." },
          { code: "phy.rot.moi", name: "Moment of Inertia", description: "Radius of gyration; MoI of standard rigid bodies; parallel and perpendicular axes theorems." },
          { code: "phy.rot.rolling", name: "Rolling Motion", description: "Rolling without slipping; KE of rolling body." },
        ],
      },
      {
        code: "phy.gravitation",
        name: "Gravitation",
        description: "Universal law of gravitation; acceleration due to gravity and its variation with altitude and depth; Kepler's laws; gravitational potential energy; gravitational potential; escape velocity; motion of a satellite, orbital velocity, time period and energy of satellite.",
        subtopics: [
          { code: "phy.grav.law", name: "Universal Law of Gravitation", description: "Newton's law of gravitation; gravitational constant." },
          { code: "phy.grav.g", name: "Acceleration due to Gravity", description: "Variation with altitude, depth, latitude and rotation of earth." },
          { code: "phy.grav.kepler", name: "Kepler's Laws", description: "Three laws of planetary motion." },
          { code: "phy.grav.satellite", name: "Satellites and Escape Velocity", description: "Orbital velocity, time period, total energy; escape velocity." },
        ],
      },
      {
        code: "phy.solids_liquids",
        name: "Properties of Solids and Liquids",
        description: "Elastic behaviour, stress-strain relationship, Hooke's law, Young's modulus, bulk modulus, modulus of rigidity; Pascal's law and its applications; viscosity; Stokes' law; terminal velocity; streamline and turbulent flow; Reynolds number; Bernoulli's principle; surface energy and surface tension; angle of contact; capillary rise; heat, temperature, thermal expansion; specific heat capacity; calorimetry; change of state, latent heat; heat transfer — conduction, convection and radiation.",
        subtopics: [
          { code: "phy.sl.elasticity", name: "Elasticity", description: "Stress, strain, Hooke's law; Young's, bulk and rigidity moduli." },
          { code: "phy.sl.fluid_statics", name: "Fluid Statics", description: "Pascal's law, atmospheric pressure, hydraulic machines." },
          { code: "phy.sl.fluid_dynamics", name: "Fluid Dynamics", description: "Bernoulli's principle, equation of continuity, viscosity, Stokes' law." },
          { code: "phy.sl.surface_tension", name: "Surface Tension", description: "Surface energy, angle of contact, capillarity." },
          { code: "phy.sl.heat", name: "Heat and Temperature", description: "Thermal expansion, calorimetry, latent heat, change of state." },
          { code: "phy.sl.heat_transfer", name: "Heat Transfer", description: "Conduction, convection, radiation; Newton's law of cooling." },
        ],
      },
      {
        code: "phy.thermodynamics",
        name: "Thermodynamics",
        description: "Thermal equilibrium; zeroth, first and second law of thermodynamics; concept of work, heat, internal energy; reversible and irreversible processes; Carnot engine and its efficiency.",
        subtopics: [
          { code: "phy.thermo.zeroth", name: "Zeroth Law", description: "Thermal equilibrium and temperature." },
          { code: "phy.thermo.first", name: "First Law", description: "Heat, work, internal energy; isothermal and adiabatic processes." },
          { code: "phy.thermo.second", name: "Second Law", description: "Reversible/irreversible processes; entropy concept." },
          { code: "phy.thermo.carnot", name: "Carnot Engine", description: "Efficiency, refrigerator and heat pump." },
        ],
      },
      {
        code: "phy.kinetic_theory",
        name: "Kinetic Theory of Gases",
        description: "Equation of state of a perfect gas, work done on compressing a gas; kinetic theory of gases — assumptions; concept of pressure; kinetic interpretation of temperature; rms speed; degrees of freedom; law of equipartition of energy; mean free path; Avogadro's number.",
        subtopics: [
          { code: "phy.kt.gas_laws", name: "Gas Laws", description: "Boyle's, Charles', Gay-Lussac's; ideal gas equation." },
          { code: "phy.kt.kinetic", name: "Kinetic Interpretation", description: "Pressure, kinetic energy and temperature relation; rms, mean and most probable speeds." },
          { code: "phy.kt.equipartition", name: "Equipartition of Energy", description: "Degrees of freedom, specific heat capacity of gases." },
        ],
      },
      {
        code: "phy.oscillations_waves",
        name: "Oscillations and Waves",
        description: "Periodic motion — period, frequency; SHM and its equation; phase; oscillations of a spring; energy in SHM; simple pendulum; free, forced and damped oscillations, resonance; wave motion; transverse and longitudinal waves; speed of travelling wave; principle of superposition; reflection of waves; standing waves in strings and organ pipes; beats; Doppler effect.",
        subtopics: [
          { code: "phy.osc.shm", name: "Simple Harmonic Motion", description: "Equation of SHM, energy, phase, time period." },
          { code: "phy.osc.pendulum", name: "Pendulum and Spring", description: "Simple pendulum, spring-mass system, compound pendulum." },
          { code: "phy.osc.damped", name: "Damped and Forced Oscillations", description: "Resonance, damping, forced oscillation amplitude." },
          { code: "phy.wav.travelling", name: "Travelling Waves", description: "Transverse and longitudinal waves; wave equation; speed in solids/liquids/gases." },
          { code: "phy.wav.standing", name: "Standing Waves", description: "Vibrations of strings, open and closed organ pipes; harmonics; beats." },
          { code: "phy.wav.doppler", name: "Doppler Effect", description: "Apparent frequency for moving source/observer." },
        ],
      },
      {
        code: "phy.electrostatics",
        name: "Electrostatics",
        description: "Electric charges and their conservation; Coulomb's law; superposition principle; electric field due to a point charge, dipole; electric field lines; electric flux; Gauss's law and its applications; electric potential; potential due to a point charge and dipole; equipotential surfaces; capacitance; series and parallel combinations of capacitors; energy stored in a capacitor.",
        subtopics: [
          { code: "phy.es.coulomb", name: "Coulomb's Law", description: "Force between two point charges; superposition principle." },
          { code: "phy.es.field", name: "Electric Field", description: "Field due to point charge, dipole; field lines; flux." },
          { code: "phy.es.gauss", name: "Gauss's Law", description: "Field due to infinite wire, plane sheet, charged shell." },
          { code: "phy.es.potential", name: "Electric Potential", description: "Potential due to point charge and dipole; equipotential surfaces." },
          { code: "phy.es.capacitance", name: "Capacitance", description: "Parallel plate capacitor with and without dielectric; combinations; energy stored." },
        ],
      },
      {
        code: "phy.current_electricity",
        name: "Current Electricity",
        description: "Electric current; drift velocity; Ohm's law; electrical resistance; V-I characteristics; resistivity and conductivity; series and parallel combination of resistors; temperature dependence; internal resistance of a cell; Kirchhoff's laws and applications — Wheatstone bridge, metre bridge, potentiometer.",
        subtopics: [
          { code: "phy.ce.ohm", name: "Ohm's Law and Resistance", description: "V-I relation, resistivity, temperature dependence." },
          { code: "phy.ce.combinations", name: "Combination of Resistors and Cells", description: "Series and parallel; emf and internal resistance." },
          { code: "phy.ce.kirchhoff", name: "Kirchhoff's Laws", description: "KCL and KVL; Wheatstone bridge balance condition." },
          { code: "phy.ce.bridge_potentiometer", name: "Metre Bridge and Potentiometer", description: "Comparison of resistances and emfs." },
        ],
      },
      {
        code: "phy.magnetic_effects",
        name: "Magnetic Effects of Current and Magnetism",
        description: "Biot-Savart law; Ampere's law; force on a moving charge in uniform magnetic and electric fields — Lorentz force; force on a current-carrying conductor; cyclotron; force between two parallel current-carrying conductors; torque on a current loop in magnetic field; moving coil galvanometer; bar magnet; magnetic dipole moment; earth's magnetic field; para-, dia- and ferromagnetism.",
        subtopics: [
          { code: "phy.mag.biot_savart", name: "Biot-Savart Law", description: "Magnetic field due to current element; field on axis of circular loop and inside a solenoid." },
          { code: "phy.mag.ampere", name: "Ampere's Circuital Law", description: "Field due to long straight conductor and toroid." },
          { code: "phy.mag.lorentz", name: "Lorentz Force", description: "Force on moving charge; cyclotron motion." },
          { code: "phy.mag.loop_torque", name: "Current Loop and Torque", description: "Torque on loop; magnetic dipole moment." },
          { code: "phy.mag.galvanometer", name: "Moving Coil Galvanometer", description: "Conversion to ammeter and voltmeter." },
          { code: "phy.mag.materials", name: "Magnetic Materials", description: "Para-, dia- and ferromagnetism; earth's magnetism." },
        ],
      },
      {
        code: "phy.emi_ac",
        name: "Electromagnetic Induction and Alternating Currents",
        description: "Electromagnetic induction; Faraday's law; induced emf and current; Lenz's law; eddy currents; self and mutual induction; alternating currents; peak and rms value; reactance and impedance; LCR series circuit, resonance; quality factor; power in AC circuits; AC generator and transformer.",
        subtopics: [
          { code: "phy.emi.faraday", name: "Faraday's Law and Lenz's Law", description: "Induced emf, magnetic flux change, motional emf." },
          { code: "phy.emi.inductance", name: "Self and Mutual Inductance", description: "Coefficients of self and mutual induction; energy in inductor." },
          { code: "phy.ac.basics", name: "AC Basics", description: "Peak, average and rms values; phasor representation." },
          { code: "phy.ac.lcr", name: "LCR Circuits", description: "Series LCR circuit, resonance, Q-factor, power factor." },
          { code: "phy.ac.transformer", name: "Transformer and AC Generator", description: "Step-up/down transformer; principle of AC generator." },
        ],
      },
      {
        code: "phy.em_waves",
        name: "Electromagnetic Waves",
        description: "Electromagnetic waves and their characteristics (qualitative); transverse nature; electromagnetic spectrum (radio, microwaves, infrared, visible, ultraviolet, X-rays, gamma rays) and their uses.",
        subtopics: [
          { code: "phy.emw.nature", name: "Nature of EM Waves", description: "Maxwell's correction, displacement current, transverse waves." },
          { code: "phy.emw.spectrum", name: "EM Spectrum", description: "Properties and applications of each band from radio to gamma rays." },
        ],
      },
      {
        code: "phy.optics",
        name: "Optics",
        description: "Reflection and refraction of light at plane and spherical surfaces; mirror formula; total internal reflection and its applications; refraction at spherical surfaces, lenses, thin lens formula; magnification; power of a lens; combination of thin lenses; refraction and dispersion through a prism; scattering of light; optical instruments — microscope and telescope; wave optics — Huygens' principle; interference, Young's double slit experiment; diffraction at single slit; polarisation; Brewster's law; Malus' law.",
        subtopics: [
          { code: "phy.opt.ray_reflection", name: "Reflection at Spherical Surfaces", description: "Mirror formula, magnification, sign convention." },
          { code: "phy.opt.refraction", name: "Refraction and TIR", description: "Snell's law, refractive index, total internal reflection, optical fibres." },
          { code: "phy.opt.lenses", name: "Thin Lenses", description: "Lens formula, lens maker's formula, power, combinations." },
          { code: "phy.opt.prism", name: "Prism and Dispersion", description: "Refraction through prism, angular dispersion, scattering of light." },
          { code: "phy.opt.instruments", name: "Optical Instruments", description: "Simple and compound microscope; refracting telescope." },
          { code: "phy.opt.wave_huygens", name: "Huygens' Principle", description: "Wavefront and wave propagation." },
          { code: "phy.opt.interference", name: "Interference", description: "Young's double slit experiment, fringe width, conditions for sustained interference." },
          { code: "phy.opt.diffraction", name: "Diffraction", description: "Single slit diffraction, central and secondary maxima." },
          { code: "phy.opt.polarisation", name: "Polarisation", description: "Plane polarised light; Brewster's law; Malus' law; Polaroids." },
        ],
      },
      {
        code: "phy.dual_nature",
        name: "Dual Nature of Matter and Radiation",
        description: "Photoelectric effect; Hertz and Lenard's observations; Einstein's photoelectric equation; particle nature of light; matter waves; de Broglie wavelength; Davisson-Germer experiment.",
        subtopics: [
          { code: "phy.dn.photoelectric", name: "Photoelectric Effect", description: "Threshold frequency, work function, Einstein's equation, stopping potential." },
          { code: "phy.dn.matter_waves", name: "Matter Waves", description: "de Broglie hypothesis; Davisson-Germer experiment." },
        ],
      },
      {
        code: "phy.atoms_nuclei",
        name: "Atoms and Nuclei",
        description: "Alpha-particle scattering experiment; Rutherford's model; Bohr's model and energy levels; hydrogen spectrum; composition and size of nucleus; mass-energy equivalence; nuclear binding energy per nucleon; mass defect; radioactivity — alpha, beta and gamma decays; half-life and mean life; nuclear fission and fusion.",
        subtopics: [
          { code: "phy.an.bohr", name: "Bohr Model", description: "Energy levels, hydrogen spectrum lines, Rydberg formula." },
          { code: "phy.an.nucleus", name: "Nucleus", description: "Size, composition, density; mass-energy relation; binding energy per nucleon." },
          { code: "phy.an.radioactivity", name: "Radioactivity", description: "Alpha, beta, gamma decay; decay law; half-life; mean life." },
          { code: "phy.an.fission_fusion", name: "Nuclear Fission and Fusion", description: "Energy release; chain reaction; thermonuclear fusion in stars." },
        ],
      },
      {
        code: "phy.electronic_devices",
        name: "Electronic Devices",
        description: "Semiconductors; semiconductor diode — I-V characteristics in forward and reverse bias; diode as a rectifier; LED, photodiode, solar cell; Zener diode and its application as voltage regulator; transistor action; logic gates (OR, AND, NOT, NAND, NOR).",
        subtopics: [
          { code: "phy.ed.semiconductors", name: "Semiconductors", description: "Intrinsic and extrinsic; p-type and n-type; energy bands." },
          { code: "phy.ed.diode", name: "Diodes and Applications", description: "p-n junction; I-V characteristics; rectifier; LED, photodiode, solar cell, Zener diode." },
          { code: "phy.ed.logic_gates", name: "Logic Gates", description: "Truth tables of OR, AND, NOT, NAND, NOR; combinational logic." },
        ],
      },
      {
        code: "phy.experimental",
        name: "Experimental Skills",
        description: "Familiarity with the basic approach and observations of the experiments and activities in NCERT — Vernier callipers, screw gauge, simple pendulum, Young's modulus by Searle's method, surface tension by capillary rise, viscosity, speed of sound by resonance tube, specific heat by method of mixtures, resistance using metre bridge and Ohm's law, focal length of mirror/lens, refractive index by travelling microscope, characteristics of p-n junction.",
        subtopics: [
          { code: "phy.exp.vernier_screw", name: "Vernier Callipers and Screw Gauge", description: "Least count, zero error, measurement of length and diameter." },
          { code: "phy.exp.pendulum", name: "Simple Pendulum", description: "Determination of g; time period vs length." },
          { code: "phy.exp.optics_lab", name: "Optics Lab", description: "Focal length of concave mirror and convex lens by u-v method; refractive index of liquid using travelling microscope." },
          { code: "phy.exp.electrical", name: "Electrical Lab", description: "Verification of Ohm's law; metre bridge; potentiometer; characteristics of p-n junction." },
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
      // Physical Chemistry
      {
        code: "chem.basic_concepts",
        name: "Some Basic Concepts in Chemistry",
        description: "Matter and its nature; Dalton's atomic theory; concept of atom, molecule, element and compound; laws of chemical combination; atomic and molecular masses; mole concept; molar mass; percentage composition; empirical and molecular formulae; chemical equations and stoichiometry.",
        subtopics: [
          { code: "chem.basic.mole", name: "Mole Concept", description: "Avogadro's number; mole-mass-volume relations." },
          { code: "chem.basic.stoichiometry", name: "Stoichiometry", description: "Balancing equations, limiting reagent, percentage yield." },
          { code: "chem.basic.concentration", name: "Concentration Terms", description: "Molarity, molality, mole fraction, normality, ppm." },
        ],
      },
      {
        code: "chem.atomic_structure",
        name: "Atomic Structure",
        description: "Bohr's model of hydrogen atom — its postulates, derivation of relations for energy of an electron and radii of orbits; dual nature of matter; de Broglie's relationship; Heisenberg uncertainty principle; quantum mechanical model of atom; orbitals; quantum numbers; Aufbau principle, Pauli's exclusion principle, Hund's rule; electronic configuration of elements.",
        subtopics: [
          { code: "chem.atom.bohr", name: "Bohr Model", description: "Postulates, energy levels, line spectrum of hydrogen." },
          { code: "chem.atom.quantum", name: "Quantum Mechanical Model", description: "Schrödinger equation (qualitative); orbitals; shapes of s, p, d." },
          { code: "chem.atom.qn_config", name: "Quantum Numbers and Configuration", description: "Four quantum numbers; Aufbau, Pauli, Hund; electronic configuration." },
        ],
      },
      {
        code: "chem.bonding",
        name: "Chemical Bonding and Molecular Structure",
        description: "Kossel-Lewis approach to chemical bond formation; ionic bond — lattice enthalpy; covalent bond — Lewis structures; polar covalent bond; valence bond theory; hybridisation involving s, p and d orbitals; resonance; molecular orbital theory of homonuclear diatomic molecules; hydrogen bonding; VSEPR theory.",
        subtopics: [
          { code: "chem.bond.ionic", name: "Ionic Bond", description: "Formation, lattice enthalpy, Born-Haber cycle, Fajans' rules." },
          { code: "chem.bond.covalent", name: "Covalent Bond", description: "Lewis structures, formal charge, polarity, dipole moment." },
          { code: "chem.bond.vbt_hybrid", name: "VBT and Hybridisation", description: "sp, sp2, sp3, sp3d, sp3d2, sp3d3 hybridisation; shapes of molecules." },
          { code: "chem.bond.mot", name: "Molecular Orbital Theory", description: "MO diagrams for H2, He2, Li2, Be2, B2, C2, N2, O2, F2; bond order." },
          { code: "chem.bond.vsepr", name: "VSEPR Theory", description: "Geometry of molecules with lone pairs; AX_n notation." },
          { code: "chem.bond.h_bond", name: "Hydrogen Bond", description: "Inter and intra molecular H-bonding; effects on physical properties." },
        ],
      },
      {
        code: "chem.thermodynamics",
        name: "Chemical Thermodynamics",
        description: "Fundamentals of thermodynamics — system and surroundings, types of system; first law of thermodynamics; concept of work, heat, internal energy and enthalpy; Hess's law; standard enthalpies of formation, combustion, neutralisation; bond dissociation enthalpy; second law of thermodynamics; entropy; Gibbs energy; spontaneity; relation between ΔG and equilibrium constant.",
        subtopics: [
          { code: "chem.thermo.first_law", name: "First Law", description: "Internal energy, work, heat, enthalpy; isothermal/adiabatic processes." },
          { code: "chem.thermo.hess", name: "Thermochemistry", description: "Hess's law; enthalpies of formation, combustion, neutralisation, atomisation, sublimation." },
          { code: "chem.thermo.entropy_gibbs", name: "Entropy and Gibbs Energy", description: "Second law; ΔS, ΔG; spontaneity; ΔG = ΔH - TΔS; ΔG° and K." },
        ],
      },
      {
        code: "chem.solutions",
        name: "Solutions",
        description: "Different methods for expressing concentration of solution; vapour pressure of solutions and Raoult's law; ideal and non-ideal solutions; colligative properties — relative lowering of vapour pressure, elevation of boiling point, depression of freezing point, osmotic pressure; van't Hoff factor.",
        subtopics: [
          { code: "chem.sol.raoult", name: "Raoult's Law", description: "Ideal solutions; positive and negative deviations; azeotropes." },
          { code: "chem.sol.colligative", name: "Colligative Properties", description: "Relative lowering of vapour pressure, ΔTb, ΔTf, osmotic pressure." },
          { code: "chem.sol.vant_hoff", name: "Van't Hoff Factor", description: "Abnormal molar mass; association and dissociation." },
        ],
      },
      {
        code: "chem.equilibrium",
        name: "Equilibrium",
        description: "Equilibria involving physical processes; equilibrium in chemical processes; law of chemical equilibrium; equilibrium constants Kp and Kc; Le Chatelier's principle; ionic equilibrium — Bronsted-Lowry and Lewis acids/bases; ionisation of weak acids and bases; pH; common ion effect; buffer solutions; solubility product; hydrolysis of salts.",
        subtopics: [
          { code: "chem.eq.chemical", name: "Chemical Equilibrium", description: "Kp, Kc relation; Le Chatelier's principle; reaction quotient." },
          { code: "chem.eq.ionic", name: "Ionic Equilibrium", description: "Acids and bases — Bronsted, Lewis; Ka, Kb, Kw; pH calculations." },
          { code: "chem.eq.buffer", name: "Buffer and Salt Hydrolysis", description: "Henderson equation; salt hydrolysis of weak acid/base salts." },
          { code: "chem.eq.ksp", name: "Solubility Product", description: "Ksp, common ion effect, selective precipitation." },
        ],
      },
      {
        code: "chem.redox_electrochem",
        name: "Redox Reactions and Electrochemistry",
        description: "Electronic concepts of oxidation and reduction; redox reactions; oxidation number; balancing redox reactions; electrolytic and metallic conduction; conductance — specific, equivalent and molar; Kohlrausch's law; electrochemical cells; EMF; standard electrode potential; Nernst equation; relation between Gibbs energy change and EMF; electrochemical series; fuel cells; corrosion; batteries; Faraday's laws of electrolysis.",
        subtopics: [
          { code: "chem.redox.balancing", name: "Redox Reactions", description: "Oxidation number; balancing by oxidation number and ion-electron methods." },
          { code: "chem.electro.conductance", name: "Conductance", description: "Specific, equivalent, molar conductance; Kohlrausch's law." },
          { code: "chem.electro.cells", name: "Galvanic Cells", description: "EMF, electrode potential, Nernst equation, electrochemical series." },
          { code: "chem.electro.faraday", name: "Electrolysis", description: "Faraday's laws of electrolysis; products of electrolysis." },
          { code: "chem.electro.batteries", name: "Batteries, Fuel Cells, Corrosion", description: "Primary and secondary cells; H2-O2 fuel cell; mechanism of corrosion." },
        ],
      },
      {
        code: "chem.kinetics",
        name: "Chemical Kinetics",
        description: "Rate of a chemical reaction; factors affecting rate of reaction; order and molecularity of a reaction; rate law and rate constant; differential and integral forms of zero and first order reactions; Arrhenius equation; activation energy; collision theory of bimolecular gaseous reactions.",
        subtopics: [
          { code: "chem.kin.rate", name: "Rate and Rate Law", description: "Average and instantaneous rate; order vs molecularity." },
          { code: "chem.kin.integrated", name: "Integrated Rate Equations", description: "Zero and first order reactions; half-life." },
          { code: "chem.kin.arrhenius", name: "Arrhenius Equation", description: "Activation energy; effect of temperature and catalyst on rate." },
        ],
      },
      // Inorganic Chemistry
      {
        code: "chem.periodicity",
        name: "Classification of Elements and Periodicity in Properties",
        description: "Modern periodic law and present form of the periodic table; s, p, d, f block elements; periodic trends in properties — atomic and ionic radii, ionisation enthalpy, electron gain enthalpy, valence, oxidation states, electronegativity, chemical reactivity.",
        subtopics: [
          { code: "chem.per.modern_law", name: "Modern Periodic Law", description: "Long form of periodic table; s, p, d, f blocks." },
          { code: "chem.per.trends", name: "Periodic Trends", description: "Atomic radius, IE, EA, electronegativity across periods and down groups." },
        ],
      },
      {
        code: "chem.p_block",
        name: "p-Block Elements (Groups 13-18)",
        description: "Group 13 to 18 elements: general introduction, electronic configuration, occurrence, oxidation states, trends in physical and chemical properties; preparation, properties and uses of compounds — boron family (borax, boric acid, diborane), carbon family (allotropes, oxides of carbon, silicates), nitrogen family (NH3, HNO3, oxides of nitrogen), oxygen family (O3, H2SO4), halogens (HCl, oxoacids, interhalogens), noble gases (xenon compounds).",
        subtopics: [
          { code: "chem.pb.group13", name: "Group 13 (Boron Family)", description: "Borax, boric acid, diborane, aluminium chloride, alums." },
          { code: "chem.pb.group14", name: "Group 14 (Carbon Family)", description: "Allotropes of carbon, CO, CO2, silicones, silicates, zeolites." },
          { code: "chem.pb.group15", name: "Group 15 (Nitrogen Family)", description: "NH3, HNO3, oxides of nitrogen, phosphine, oxoacids of phosphorus." },
          { code: "chem.pb.group16", name: "Group 16 (Oxygen Family)", description: "O2, O3, sulphur allotropes, H2SO4, oxoacids of sulphur." },
          { code: "chem.pb.group17", name: "Group 17 (Halogens)", description: "Trends; HCl, oxoacids of halogens, interhalogen compounds, bleaching powder." },
          { code: "chem.pb.group18", name: "Group 18 (Noble Gases)", description: "Xenon fluorides and oxides; uses." },
        ],
      },
      {
        code: "chem.df_block",
        name: "d- and f-Block Elements",
        description: "General introduction, electronic configuration, occurrence and characteristics of transition elements; trends in metallic character, atomic and ionic sizes, ionisation enthalpy, oxidation states; coloured ions, magnetic properties, catalytic property, alloy formation; preparation and properties of K2Cr2O7 and KMnO4; lanthanoids and actinoids — electronic configurations, oxidation states, lanthanoid contraction.",
        subtopics: [
          { code: "chem.df.transition", name: "Transition Elements (3d series)", description: "Electronic configuration, oxidation states, magnetic and catalytic properties." },
          { code: "chem.df.kmno4_k2cr2o7", name: "Important Compounds", description: "Preparation, properties of KMnO4 and K2Cr2O7." },
          { code: "chem.df.lanthanoids", name: "Lanthanoids", description: "Electronic configuration, oxidation states, lanthanoid contraction and consequences." },
          { code: "chem.df.actinoids", name: "Actinoids", description: "Electronic configuration, oxidation states, comparison with lanthanoids." },
        ],
      },
      {
        code: "chem.coordination",
        name: "Coordination Compounds",
        description: "Introduction; ligands; coordination number; nomenclature; isomerism (structural and stereo); bonding — Werner's theory, valence bond theory, crystal field theory; magnetic properties; importance of coordination compounds (in qualitative analysis, biological systems, medicinal chemistry, catalysis).",
        subtopics: [
          { code: "chem.coord.nomen", name: "Nomenclature", description: "IUPAC nomenclature of mononuclear coordination compounds." },
          { code: "chem.coord.isomerism", name: "Isomerism", description: "Structural (linkage, ionisation, hydrate, coordination) and stereo (geometrical, optical) isomerism." },
          { code: "chem.coord.bonding", name: "Bonding Theories", description: "Werner's theory, VBT, CFT (Δo, Δt), spin-only magnetic moment." },
          { code: "chem.coord.applications", name: "Applications", description: "Role of coordination compounds in biology, medicine, catalysis, qualitative analysis." },
        ],
      },
      // Organic Chemistry
      {
        code: "chem.purification",
        name: "Purification and Characterisation of Organic Compounds",
        description: "Purification methods — crystallisation, sublimation, distillation, differential extraction and chromatography (principles only); qualitative analysis — detection of nitrogen, sulphur, phosphorus and halogens; quantitative analysis (basic principles only); calculation of empirical formulae and molecular formulae.",
        subtopics: [
          { code: "chem.pur.purification", name: "Purification Methods", description: "Crystallisation, distillation (simple, fractional, steam, vacuum), chromatography." },
          { code: "chem.pur.qualitative", name: "Qualitative Analysis", description: "Lassaigne's test for N, S, halogens, P." },
          { code: "chem.pur.quantitative", name: "Quantitative Analysis", description: "Estimation of C, H, N, S, halogens; empirical and molecular formula calculations." },
        ],
      },
      {
        code: "chem.organic_basics",
        name: "Some Basic Principles of Organic Chemistry",
        description: "Tetravalency of carbon; shapes of simple molecules — hybridisation (s and p); classification of organic compounds based on functional groups; nomenclature (trivial and IUPAC); covalent bond fission — homolytic and heterolytic; electronic effects (inductive, electromeric, resonance, hyperconjugation); types of organic reactions.",
        subtopics: [
          { code: "chem.ob.iupac", name: "IUPAC Nomenclature", description: "Rules for naming open-chain, cyclic, and substituted compounds." },
          { code: "chem.ob.isomerism", name: "Isomerism", description: "Structural and stereoisomerism (geometrical, optical)." },
          { code: "chem.ob.electronic_effects", name: "Electronic Effects", description: "Inductive, electromeric, mesomeric, hyperconjugation; resonance." },
          { code: "chem.ob.reaction_intermediates", name: "Reactive Intermediates", description: "Carbocations, carbanions, free radicals, carbenes — stability and structure." },
          { code: "chem.ob.reaction_types", name: "Types of Reactions", description: "Substitution, addition, elimination, rearrangement reactions." },
        ],
      },
      {
        code: "chem.hydrocarbons",
        name: "Hydrocarbons",
        description: "Classification — alkanes, alkenes, alkynes, aromatic; conformations of ethane and butane; cis-trans isomerism; methods of preparation, physical and chemical properties; mechanism of free-radical halogenation, addition reactions, electrophilic substitution in benzene; directive influence of functional groups in monosubstituted benzene.",
        subtopics: [
          { code: "chem.hc.alkanes", name: "Alkanes", description: "Preparation; conformations of ethane and butane (Newman projections); halogenation mechanism." },
          { code: "chem.hc.alkenes", name: "Alkenes", description: "Preparation by elimination; Markovnikov and anti-Markovnikov addition; ozonolysis; hydration; hydroboration." },
          { code: "chem.hc.alkynes", name: "Alkynes", description: "Acidic nature of terminal alkynes; addition reactions; polymerisation." },
          { code: "chem.hc.aromatic", name: "Aromatic Hydrocarbons", description: "Benzene structure; aromaticity (Hückel's rule); electrophilic substitution — halogenation, nitration, sulphonation, Friedel-Crafts." },
        ],
      },
      {
        code: "chem.org_halogens",
        name: "Organic Compounds Containing Halogens",
        description: "Haloalkanes and haloarenes — nomenclature, methods of preparation, physical and chemical properties; SN1 and SN2 reactions; uses and environmental effects of dichloromethane, trichloromethane, tetrachloromethane, iodoform, freons, DDT.",
        subtopics: [
          { code: "chem.oh.haloalkanes", name: "Haloalkanes", description: "Preparation; SN1 vs SN2 mechanisms; stereochemistry; elimination." },
          { code: "chem.oh.haloarenes", name: "Haloarenes", description: "Preparation; nucleophilic substitution; effect of substituents." },
          { code: "chem.oh.polyhalogen", name: "Polyhalogen Compounds", description: "DDT, freons, chloroform; uses and environmental impact." },
        ],
      },
      {
        code: "chem.org_oxygen",
        name: "Organic Compounds Containing Oxygen",
        description: "Alcohols, phenols and ethers — nomenclature, methods of preparation, physical and chemical properties; identification of primary, secondary and tertiary alcohols; mechanism of dehydration; acidic nature of phenols; aldehydes and ketones — nomenclature, preparation, properties, mechanism of nucleophilic addition; aldol and Cannizzaro reactions; carboxylic acids and derivatives.",
        subtopics: [
          { code: "chem.ox.alcohols", name: "Alcohols", description: "Preparation, properties, distinction of 1°, 2°, 3°; oxidation, dehydration." },
          { code: "chem.ox.phenols", name: "Phenols", description: "Preparation; acidic character; Reimer-Tiemann, Kolbe, electrophilic substitution." },
          { code: "chem.ox.ethers", name: "Ethers", description: "Preparation by Williamson synthesis; cleavage by HX." },
          { code: "chem.ox.aldehydes_ketones", name: "Aldehydes and Ketones", description: "Preparation; nucleophilic addition mechanism; aldol, Cannizzaro, haloform; oxidation, reduction." },
          { code: "chem.ox.carboxylic", name: "Carboxylic Acids", description: "Preparation, acidic strength, derivatives — esters, anhydrides, acid chlorides, amides." },
        ],
      },
      {
        code: "chem.org_nitrogen",
        name: "Organic Compounds Containing Nitrogen",
        description: "Amines — nomenclature, classification, preparation, physical and chemical properties; basicity of amines; identification of primary, secondary and tertiary amines; diazonium salts — preparation, important reactions and synthetic usefulness in aromatic compounds.",
        subtopics: [
          { code: "chem.on.amines", name: "Amines", description: "Preparation (Hoffmann, Gabriel); basicity; reaction with HNO2; carbylamine test; Hinsberg test." },
          { code: "chem.on.diazonium", name: "Diazonium Salts", description: "Preparation; Sandmeyer, Gattermann; coupling reactions; conversion to phenols, halides." },
          { code: "chem.on.cyanides", name: "Cyanides and Isocyanides", description: "Preparation and properties; structure." },
        ],
      },
      {
        code: "chem.biomolecules",
        name: "Biomolecules",
        description: "General introduction and importance of biomolecules; carbohydrates — classification (mono-, di-, polysaccharides), glucose, fructose, sucrose, starch, cellulose; proteins — amino acids, peptide bond, primary and secondary structure; vitamins — classification and function; nucleic acids — DNA and RNA.",
        subtopics: [
          { code: "chem.bio.carbohydrates", name: "Carbohydrates", description: "Classification; structures of glucose, fructose, sucrose, starch, cellulose; reducing/non-reducing sugars." },
          { code: "chem.bio.proteins", name: "Amino Acids and Proteins", description: "Classification of amino acids; peptide bond; primary, secondary, tertiary, quaternary structures of proteins." },
          { code: "chem.bio.vitamins", name: "Vitamins", description: "Fat- and water-soluble vitamins; deficiency diseases." },
          { code: "chem.bio.nucleic", name: "Nucleic Acids", description: "DNA and RNA — structure, types, biological functions." },
        ],
      },
      {
        code: "chem.principles_practical",
        name: "Principles Related to Practical Chemistry",
        description: "Detection of extra elements (N, S, halogens) in organic compounds; detection of functional groups — hydroxyl (alcoholic, phenolic), carbonyl (aldehyde and ketone), carboxyl, amino; chemistry involved in titrimetric exercises — acid-base titrations using oxalic acid, potassium permanganate, ferrous sulphate; chemistry of qualitative analysis of cations and anions.",
        subtopics: [
          { code: "chem.prp.detection", name: "Detection of Functional Groups", description: "Tests for —OH, —CHO, >C=O, —COOH, —NH2 groups." },
          { code: "chem.prp.titrations", name: "Titrations", description: "Acid-base titrations; redox titrations using KMnO4, FeSO4, oxalic acid." },
          { code: "chem.prp.salt_analysis", name: "Salt Analysis", description: "Qualitative analysis of acidic and basic radicals (cations and anions)." },
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
        code: "math.sets_relations",
        name: "Sets, Relations and Functions",
        description: "Sets and their representation; union, intersection and complement of sets and their algebraic properties; power set; relation, types of relations, equivalence relations; functions — one-to-one, into and onto; composition of functions.",
        subtopics: [
          { code: "math.sr.sets", name: "Sets", description: "Operations on sets, De Morgan's laws, cardinality." },
          { code: "math.sr.relations", name: "Relations", description: "Reflexive, symmetric, transitive, equivalence relations." },
          { code: "math.sr.functions", name: "Functions", description: "Domain, range; types of functions; composition; invertibility." },
        ],
      },
      {
        code: "math.complex_quadratic",
        name: "Complex Numbers and Quadratic Equations",
        description: "Complex numbers as ordered pairs; representation in argand plane; algebra of complex numbers; modulus and argument; triangle inequality; quadratic equations in real and complex number system; relations between roots and coefficients; nature of roots; formation of quadratic equations with given roots.",
        subtopics: [
          { code: "math.cq.complex", name: "Complex Numbers", description: "Algebra; argand plane; polar form; cube roots of unity; De Moivre's theorem." },
          { code: "math.cq.quadratic", name: "Quadratic Equations", description: "Discriminant, nature of roots, sum/product of roots, formation of equations." },
        ],
      },
      {
        code: "math.matrices_det",
        name: "Matrices and Determinants",
        description: "Matrices, algebra of matrices, types of matrices; determinants and matrices of order two and three; properties of determinants; evaluation of determinants; area of triangle using determinants; adjoint and inverse of a matrix; test of consistency and solution of simultaneous linear equations using determinants and matrices.",
        subtopics: [
          { code: "math.md.algebra", name: "Algebra of Matrices", description: "Addition, multiplication, transpose; symmetric, skew-symmetric, diagonal matrices." },
          { code: "math.md.determinants", name: "Determinants", description: "Properties; expansion; minors and cofactors; area of triangle." },
          { code: "math.md.inverse", name: "Adjoint and Inverse", description: "Adjoint, inverse of square matrix; properties." },
          { code: "math.md.linear_eq", name: "Solving Linear Equations", description: "Cramer's rule; matrix method; consistency of system." },
        ],
      },
      {
        code: "math.pnc",
        name: "Permutations and Combinations",
        description: "Fundamental principle of counting; permutation as an arrangement and combination as selection; meaning of P(n,r) and C(n,r); simple applications.",
        subtopics: [
          { code: "math.pnc.principle", name: "Fundamental Principle of Counting", description: "Multiplication and addition principles." },
          { code: "math.pnc.permutations", name: "Permutations", description: "Linear and circular arrangements; permutations with repetition and restrictions." },
          { code: "math.pnc.combinations", name: "Combinations", description: "Selection problems; division into groups; identities involving C(n,r)." },
        ],
      },
      {
        code: "math.binomial",
        name: "Binomial Theorem and its Simple Applications",
        description: "Binomial theorem for a positive integral index; general term and middle term; properties of binomial coefficients and simple applications.",
        subtopics: [
          { code: "math.bin.theorem", name: "Binomial Theorem", description: "Expansion; general term; middle term." },
          { code: "math.bin.coefficients", name: "Binomial Coefficients", description: "Sum, properties, and identities of binomial coefficients." },
        ],
      },
      {
        code: "math.sequences_series",
        name: "Sequences and Series",
        description: "Arithmetic and geometric progressions; insertion of arithmetic and geometric means between two given numbers; relation between AM and GM; sum up to n terms of special series — Sn, Sn^2, Sn^3; arithmetico-geometric progression.",
        subtopics: [
          { code: "math.ss.ap", name: "Arithmetic Progression", description: "nth term and sum of n terms; arithmetic mean." },
          { code: "math.ss.gp", name: "Geometric Progression", description: "nth term, sum of n terms, sum to infinity; geometric mean." },
          { code: "math.ss.special_series", name: "Special Series", description: "Sums of natural numbers, squares, cubes; AGP." },
        ],
      },
      {
        code: "math.limits_continuity",
        name: "Limit, Continuity and Differentiability",
        description: "Real-valued functions, algebra of functions, polynomial, rational, trigonometric, logarithmic and exponential functions; inverse functions; graphs of simple functions; limits, continuity and differentiability; differentiation of sum, difference, product and quotient of functions; derivatives of trigonometric, inverse trigonometric, logarithmic, exponential, composite and implicit functions; Rolle's and Lagrange's mean value theorems; applications — tangents and normals, increasing and decreasing functions, maxima and minima.",
        subtopics: [
          { code: "math.lc.limits", name: "Limits", description: "Standard limits; L'Hopital's rule; limits of trigonometric, exponential and log forms." },
          { code: "math.lc.continuity", name: "Continuity", description: "Continuity at a point and on an interval; algebra of continuous functions." },
          { code: "math.lc.differentiability", name: "Differentiability", description: "Differentiability implies continuity; non-differentiable points." },
          { code: "math.lc.differentiation", name: "Differentiation Rules", description: "Chain rule; implicit, parametric, logarithmic differentiation; higher-order derivatives." },
          { code: "math.lc.applications", name: "Applications of Derivatives", description: "Rate of change, tangents/normals, monotonicity, maxima/minima, MVT, Rolle's theorem." },
        ],
      },
      {
        code: "math.integral_calculus",
        name: "Integral Calculus",
        description: "Integral as an anti-derivative; fundamental integrals involving algebraic, trigonometric, exponential and logarithmic functions; integration by substitution, by parts and by partial fractions; integration using trigonometric identities; evaluation of simple integrals; fundamental theorem of calculus; properties of definite integrals; evaluation of definite integrals; determining areas of regions bounded by simple curves.",
        subtopics: [
          { code: "math.ic.indefinite", name: "Indefinite Integrals", description: "Standard integrals; substitution, by parts, partial fractions, trigonometric identities." },
          { code: "math.ic.definite", name: "Definite Integrals", description: "Properties; fundamental theorem of calculus; definite integral as limit of a sum." },
          { code: "math.ic.area", name: "Area Under Curves", description: "Area bounded by lines, parabolas, ellipses and circles." },
        ],
      },
      {
        code: "math.differential_eq",
        name: "Differential Equations",
        description: "Ordinary differential equations, their order and degree; formation of differential equations; solution of differential equations by the method of separation of variables; solution of homogeneous and linear differential equations of the first order.",
        subtopics: [
          { code: "math.de.basics", name: "Order, Degree, Formation", description: "Definitions; formation of DE from family of curves." },
          { code: "math.de.variable_separable", name: "Variable Separable", description: "Solution by separation of variables." },
          { code: "math.de.homogeneous", name: "Homogeneous Equations", description: "Substitution y = vx; solution of homogeneous DEs." },
          { code: "math.de.linear", name: "Linear First Order DE", description: "Integrating factor method." },
        ],
      },
      {
        code: "math.coord_geometry",
        name: "Coordinate Geometry",
        description: "Cartesian system of rectangular coordinates in a plane; distance formula; section formula; locus and its equation; slope of a line; parallel and perpendicular lines; intercepts of a line on coordinate axes; various forms of equations of a line; distance of a point from a line; circle; conic sections — parabola, ellipse, hyperbola in standard form.",
        subtopics: [
          { code: "math.cg.straight_line", name: "Straight Lines", description: "Slope, various forms; angle between lines; distance from a point; family of lines." },
          { code: "math.cg.circle", name: "Circle", description: "Standard, general, parametric equations; tangent and normal; common chord." },
          { code: "math.cg.parabola", name: "Parabola", description: "Standard equation; focus, directrix, latus rectum; tangent and normal." },
          { code: "math.cg.ellipse", name: "Ellipse", description: "Standard equation; foci, directrices, eccentricity; tangent and normal." },
          { code: "math.cg.hyperbola", name: "Hyperbola", description: "Standard equation; foci, directrices, eccentricity; conjugate hyperbola; asymptotes." },
        ],
      },
      {
        code: "math.3d_geometry",
        name: "Three-Dimensional Geometry",
        description: "Coordinates of a point in space; distance between two points; section formula; direction ratios and direction cosines; angle between two intersecting lines; skew lines; shortest distance between them and its equation; equations of a line and a plane in different forms; intersection of a line and a plane; coplanar lines.",
        subtopics: [
          { code: "math.3d.basics", name: "Coordinates in Space", description: "Distance, section formula, direction ratios and cosines." },
          { code: "math.3d.line", name: "Equation of a Line", description: "Vector and Cartesian forms; angle between lines; skew lines and shortest distance." },
          { code: "math.3d.plane", name: "Equation of a Plane", description: "Vector and Cartesian forms; angle between planes; line-plane intersection; coplanarity." },
        ],
      },
      {
        code: "math.vector_algebra",
        name: "Vector Algebra",
        description: "Vectors and scalars; addition of vectors; components in two and three dimensions; scalar and vector products; scalar and vector triple products.",
        subtopics: [
          { code: "math.va.basics", name: "Vector Operations", description: "Addition, scalar multiplication, position vectors, components." },
          { code: "math.va.products", name: "Dot and Cross Products", description: "Scalar and vector products; geometrical interpretation." },
          { code: "math.va.triple", name: "Triple Products", description: "Scalar triple product (volume of parallelepiped) and vector triple product." },
        ],
      },
      {
        code: "math.statistics_probability",
        name: "Statistics and Probability",
        description: "Measures of dispersion — mean, median, mode of grouped and ungrouped data; standard deviation, variance and mean deviation for grouped and ungrouped data; probability — probability of an event, addition and multiplication theorems of probability, Baye's theorem, probability distribution of a random variate, Bernoulli trials and binomial distribution.",
        subtopics: [
          { code: "math.sp.statistics", name: "Statistics", description: "Mean, median, mode; variance, standard deviation, mean deviation." },
          { code: "math.sp.probability", name: "Probability", description: "Sample space, events; addition and multiplication theorems; conditional probability." },
          { code: "math.sp.bayes", name: "Bayes' Theorem", description: "Total probability theorem and Bayes' theorem applications." },
          { code: "math.sp.random_variable", name: "Random Variable and Binomial", description: "Discrete random variable; probability distribution; Bernoulli trials; binomial distribution." },
        ],
      },
      {
        code: "math.trigonometry",
        name: "Trigonometry",
        description: "Trigonometrical identities and equations; trigonometrical functions; inverse trigonometrical functions and their properties; heights and distances.",
        subtopics: [
          { code: "math.trig.identities", name: "Trigonometric Identities", description: "Sum, difference, multiple, sub-multiple angle formulae; transformation formulae." },
          { code: "math.trig.equations", name: "Trigonometric Equations", description: "General solutions of trigonometric equations." },
          { code: "math.trig.inverse", name: "Inverse Trigonometric Functions", description: "Domain, range, principal value; properties and identities." },
          { code: "math.trig.heights_distances", name: "Heights and Distances", description: "Application to angles of elevation and depression." },
        ],
      },
    ],
  },
];

export async function seedJeeMainSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JEE_MAIN" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JEE_MAIN exam not found.");
  }
  console.log(`Seeding JEE Main syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jeeMainSyllabus.length; sIdx++) {
    const s = jeeMainSyllabus[sIdx];
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
  seedJeeMainSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
