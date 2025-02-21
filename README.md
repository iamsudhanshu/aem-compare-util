# AEM Server Comparison Tool

A web-based tool to compare bundles and packages between two AEM servers.

## Features

- Compare OSGi bundles between two AEM servers
- Compare installed packages between two AEM servers
- Upload JSON files or paste JSON content directly
- Visual comparison with highlighted differences
- Sortable tables
- Formatted dates and file sizes

## How to Use

1. Visit the [AEM Server Comparison Tool](https://iamsudhanshu.github.io/aem-compare-util/)
2. Get JSON data from your AEM servers:
   - For bundles: `http://localhost:4502/system/console/bundles.json`
   - For packages: `http://localhost:4502/crx/packmgr/list.jsp`
3. Either upload the JSON files or paste the content into the text areas
4. Click "Compare Bundles" or "Compare Packages" to see the differences

## Local Development

1. Clone the repository
2. Open `index.html` in your browser
3. Make changes to the code as needed

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the Apache License, Version 2.0 - see the [LICENSE](LICENSE) file for details. 
