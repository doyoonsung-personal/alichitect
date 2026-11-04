// The bundled catalog (the same JSON the server loads), indexed once. Used for names, icons, lanes and prices in the
// browser; the server's catalog version from /api/health is shown in the footer when it answers.
import products from '@ali/catalog/products.json' with { type: 'json' };
import offerings from '@ali/catalog/offerings.json' with { type: 'json' };
import { createCatalog } from '@ali/core/catalog.ts';
import type { CatalogFile } from '@ali/core/catalog.ts';

export const catalog = createCatalog(products as unknown as CatalogFile, offerings as unknown as CatalogFile);
