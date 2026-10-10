import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Karteikasten: practica alemán', loadComponent: () => import('./pages/home').then((m) => m.Home) },
  { path: 'juegos', title: 'Juegos – Karteikasten', loadComponent: () => import('./pages/games').then((m) => m.Games) },
  { path: 'articulos', title: 'Artículos – Karteikasten', loadComponent: () => import('./pages/articles').then((m) => m.Articles) },
  { path: 'frases', title: 'Frases – Karteikasten', loadComponent: () => import('./pages/phrases').then((m) => m.Phrases) },
  { path: 'tarjetas', title: 'Tarjetas – Karteikasten', loadComponent: () => import('./pages/flashcards').then((m) => m.Flashcards) },
  { path: 'test', title: 'Test – Karteikasten', loadComponent: () => import('./pages/quiz').then((m) => m.Quiz) },
  { path: 'escribir', title: 'Escribir – Karteikasten', loadComponent: () => import('./pages/write').then((m) => m.Write) },
  { path: 'palabras', title: 'Palabras – Karteikasten', loadComponent: () => import('./pages/browse').then((m) => m.Browse) },
  { path: 'verbos', title: 'Verbos – Karteikasten', loadComponent: () => import('./pages/verbs').then((m) => m.Verbs) },
  { path: 'gramatica', title: 'Gramática – Karteikasten', loadComponent: () => import('./pages/grammar').then((m) => m.Grammar) },
  { path: '**', redirectTo: '' },
];
