const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, search, replace) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) return;
  let content = fs.readFileSync(absPath, 'utf8');
  if (content.includes(search)) {
    content = content.replaceAll(search, replace);
    fs.writeFileSync(absPath, content, 'utf8');
    console.log('Fixed in:', filePath);
  }
}

replaceInFile(
  'apps/local-web/src/modules/module-b-projects/components/ProjectOverviewPanel.tsx',
  'landRegistryReference',
  'landTitleReference'
);

replaceInFile(
  'apps/local-web/src/modules/module-b-projects/pages/ProjectsAccessView.tsx',
  'landRegistryReference',
  'landTitleReference'
);

replaceInFile(
  'apps/local-web/src/modules/module-d-customers-parties/pages/ProjectCustomerRegistryModal.tsx',
  'fullNameOrCompanyName',
  'displayName'
);

replaceInFile(
  'apps/local-web/src/modules/module-e-reservations/pages/ProjectSalesReservationsModal.tsx',
  'propertyUnitNumber',
  'unitNumber'
);

replaceInFile(
  'apps/local-web/src/modules/module-k-documents/pages/ProjectDocumentsModal.tsx',
  'fileName',
  'originalFileName'
);
replaceInFile(
  'apps/local-web/src/modules/module-k-documents/pages/ProjectDocumentsModal.tsx',
  'sha256Hash',
  'sha256Checksum'
);
replaceInFile(
  'apps/local-web/src/modules/module-k-documents/pages/ProjectDocumentsModal.tsx',
  'uploadedAtUtc',
  'createdAtUtc'
);

console.log('Type error fixes applied.');
