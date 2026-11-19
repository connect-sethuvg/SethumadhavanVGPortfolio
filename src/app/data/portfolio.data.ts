import { Experience, ProjectCuration, Profile, SkillGroup } from './models';

// Single source of truth for the portfolio content (taken from the resume).
// Edit this file to change what both the 3D gallery and the 2D page show.

export const PROFILE: Profile = {
  name: 'Sethu Madhavan V G',
  shortName: 'Sethu',
  initials: 'SM',
  title: 'Software Developer (.NET)',
  tagline: 'I build clean, scalable backends with C#, ASP.NET Core and Azure, plus Angular frontends.',
  location: 'Palakkad, Kerala, India',
  summary: [
    'Software Developer with 2+ years of hands-on experience across full-time and internship roles, specialising in C#, ASP.NET Core, .NET, Entity Framework Core, SQL Server and Angular.',
    'I currently build the Checkout, Commission and Product Catalogue microservices for a telecom SaaS distributor management platform.',
    'I work with RESTful API design, layered architecture, dependency injection, repository and unit-of-work patterns, EF Core query optimisation and hierarchy-based access control, and I support production on Microsoft Azure (AKS, Service Bus, Application Insights).',
  ],
  languagesSpoken: ['English', 'Malayalam', 'Hindi', 'Tamil'],
  education: {
    degree: 'B.Tech, Computer Science and Engineering',
    school: 'MEA Engineering College, Malappuram',
    university: 'APJ Abdul Kalam Technological University (KTU), Kerala',
  },
  links: {
    email: 'sethuvalanchery@gmail.com',
    linkedin: 'https://linkedin.com/in/sethuvg',
    github: 'https://github.com/connect-sethuvg',
    // Put a PDF in /public and set e.g. 'resume.pdf' to show a download button.
    resume: null,
  },
};

export const SKILL_GROUPS: SkillGroup[] = [
  { title: 'Languages', skills: ['C#', 'SQL (T-SQL)', 'TypeScript', 'Dart'] },
  {
    title: 'Backend',
    skills: ['ASP.NET Core Web API', '.NET', 'Entity Framework Core', 'LINQ', 'RESTful APIs', 'Microservices'],
  },
  {
    title: 'Architecture',
    skills: ['Layered / MVC Architecture', 'Dependency Injection', 'Repository & Unit of Work', 'RBAC'],
  },
  { title: 'Frontend', skills: ['Angular', 'HTML', 'CSS', 'Bootstrap'] },
  { title: 'Database', skills: ['SQL Server', 'Azure SQL Database', 'EF Core Migrations', 'Query Optimisation'] },
  {
    title: 'Cloud & DevOps',
    skills: ['Microsoft Azure', 'Docker', 'Kubernetes (AKS)', 'Azure Container Registry', 'Azure Service Bus'],
  },
  { title: 'Monitoring', skills: ['Azure Monitor', 'Application Insights'] },
  { title: 'Tools', skills: ['Git', 'Visual Studio', 'VS Code', 'Postman', 'Swagger / OpenAPI'] },
  { title: 'Mobile', skills: ['Flutter', 'Firebase', 'Bloc', 'Provider'] },
];

export const EXPERIENCE: Experience[] = [
  {
    role: 'Junior Software Developer',
    company: 'Recharge India Pvt Ltd',
    start: 'Jun 2025',
    end: 'Present',
    project: 'DDMP: Distributor Management System (SaaS) for Ooredoo Qatar',
    summary:
      'Feature delivery across the Checkout, Commission and Product Catalogue microservices of a SaaS platform for Ooredoo Qatar distributor and merchant operations.',
    highlights: [
      'Built RESTful APIs in ASP.NET Core Web API for checkout hierarchy and transaction tracking, documented with Swagger/OpenAPI.',
      'Delivered the end-to-end checkout transaction flow with business-rule validation across the distributor–merchant hierarchy.',
      'Enforced hierarchy-based RBAC for Distributor and Merchant roles.',
      'Designed server-side pagination and filtering with EF Core and LINQ, cutting payload size and response times.',
      'Tuned EF Core and Azure SQL access with async/await and query projection; managed schema changes with migrations.',
      'Used Azure Service Bus for event-driven messaging and supported releases via Docker, ACR and AKS.',
      'Diagnosed production issues with Azure Monitor and Application Insights.',
    ],
    tech: ['C#', 'ASP.NET Core', 'EF Core', 'LINQ', 'Angular', 'Azure SQL', 'Docker', 'AKS', 'Service Bus', 'App Insights'],
  },
  {
    role: 'Software Developer Intern (Flutter)',
    company: 'Softloom Technology Pvt Ltd',
    location: 'Ernakulam',
    start: 'May 2024',
    end: 'Dec 2024',
    project: 'Student Management System',
    summary:
      'Cross-platform student management app for student records, data entry and admin workflows, backed by REST APIs and Firebase.',
    highlights: [
      'Set up a feature-based structure with modular navigation and reusable widgets.',
      'Integrated REST APIs through a service layer with typed JSON models.',
      'Managed state with Bloc and Provider to keep business logic out of the UI.',
      'Implemented Firebase authentication, real-time sync and cloud storage.',
      'Fixed critical defects and performance issues; took part in peer code reviews.',
    ],
    tech: ['Flutter', 'Dart', 'REST APIs', 'Firebase', 'Bloc', 'Provider'],
  },
  {
    role: 'Customer Service Associate',
    company: 'Sutherland Global Services Pvt Ltd',
    start: 'Jun 2022',
    end: 'Mar 2025',
    summary: 'Resolved high volumes of customer queries with accurate, policy-compliant solutions.',
    highlights: [
      'Met quality and turnaround targets on high query volumes.',
      'Kept detailed case documentation for efficient handovers.',
    ],
    tech: [],
  },
];

/**
 * Curated project copy. Order here = order in the gallery.
 * Repo metadata (language, stars, url) comes from repos.generated.ts at build time;
 * any new public repo not listed here is appended automatically using its README.
 */
export const PROJECT_CURATION: ProjectCuration[] = [
  {
    repos: ['contactapp', 'ContactFrontend'],
    title: 'Contact Manager',
    tagline: 'Full-stack contact app: layered ASP.NET Core API with an Angular client.',
    description:
      'A contact management application built as a layered .NET solution. It has separate business, data-service, DTO and mapper projects, each behind its own contracts, and an Angular frontend consumes it.',
    highlights: [
      'Layered architecture with contract interfaces for each layer',
      'DTOs and dedicated mappers between the API and the domain',
      'Angular (TypeScript) frontend calling the REST API',
    ],
    tech: ['C#', 'ASP.NET Core', 'Angular', 'TypeScript'],
  },
  {
    repos: ['llmAutoInvoice-processor-'],
    title: 'LLM Auto Invoice Processor',
    tagline: 'Fully local AI invoice pipeline: 10–15 minutes of manual work down to about 30 seconds.',
    description:
      'An automated invoice pipeline powered by a local Ollama LLM, with no cloud AI. It numbers and stamps invoice PDFs, extracts fields through OCR and an LLM into structured JSON, uploads to SharePoint and updates the Excel register.',
    highlights: [
      'OCR → Ollama LLM → structured JSON field extraction',
      'PDF stamping with PyMuPDF; Excel automation with openpyxl',
      'SharePoint upload and links via the Microsoft Graph API',
    ],
    tech: ['Python', 'Ollama', 'PyMuPDF', 'openpyxl', 'Microsoft Graph'],
  },
  {
    repos: ['sonnetDetails'],
    title: 'Kia Sonet Digital Showroom',
    tagline: 'React microsite for exploring variants, Kerala on-road prices and comparisons.',
    description:
      'A polished React and TypeScript microsite for browsing Kia Sonet variants, comparing trims and checking Kerala on-road pricing. It deploys to GitHub Pages automatically through a CI workflow.',
    highlights: ['Variant explorer and comparison views', 'On-road price breakdowns', 'Automated GitHub Pages deploys'],
    tech: ['React', 'TypeScript', 'Vite', 'GitHub Actions'],
    live: 'https://connect-sethuvg.github.io/sonnetDetails/',
  },
  {
    repos: ['keralaproperty'],
    title: 'Kerala Property',
    tagline: 'Property listing web app built with Angular.',
    description: 'A property listing application for browsing real-estate listings in Kerala, built with Angular.',
    highlights: ['Listing and detail views', 'Component-based Angular UI'],
    tech: ['Angular', 'TypeScript', 'HTML', 'CSS'],
  },
  {
    repos: ['VAsthra_Inventory'],
    title: 'Vasthra Inventory',
    tagline: 'Inventory management app for a clothing store.',
    description: 'A lightweight inventory management web app for tracking stock, built with TypeScript and Vite.',
    highlights: ['Stock tracking UI', 'Vite + TypeScript tooling'],
    tech: ['TypeScript', 'Vite', 'HTML'],
  },
];
