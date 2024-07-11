=== BudCoder WP ===
Contributors: easychen
Tags: AI, code generation, plugin editor, WordPress
Requires at least: 5.0
Tested up to: 6.5.3
Stable tag: 1.0.5
Requires PHP: 7.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Create, modify, and test WordPress plugins on the fly with AI.

== Description ==

BudCoder WP is a simplified version of BudCoder.com, providing a specialized AI code generation service dedicated to WordPress. It aims to offer an extremely convenient code generation service for developers and advanced users. Features include:

* Launch a fully functional WordPress environment in your browser for debugging and testing within twenty seconds.
* Import plugins from the online server to the debugging environment by creating tickets. The entire process is done on the browser side, ensuring privacy and security.
* Automatically generate and modify plugin code through conversational interaction with AI. Deploy and test with a single click, and export the plugin with ease.
* Customize AI prompts for generating and modifying code, providing high freedom and playability.

**Limitations of Bud Coder**

Currently, Bud Coder is in its early stages, with basic processes completed but optimization of the intelligent system not yet started. Due to the limitations of the GPT-4O model, there are certain restrictions:

* Suitable for automatically handling simple logic and writing moderately complex plugins under human interaction. High complexity tasks cannot be completed yet.
* Can only modify specified single files, not the entire plugin directory.
* Due to GPT4O's maximum context of 128K, considering output return, the maximum code submission length should be within 40-50K tokens.

== Installation ==

1. Install it in WordPress directory.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Use the BudCoder menu item in the WordPress admin dashboard to interact with the plugin.

== Frequently Asked Questions ==

= How does the plugin ensure privacy and security? =
All operations are done on the browser side, ensuring that no data is sent to the server.

= What kind of tasks can the AI handle? =
The AI can handle simple to moderately complex tasks. High complexity tasks may not be fully supported at this stage.

= Is the AI functionality free? =
The AI functionality requires an OpenAI key.


== Screenshots ==

1. ![new plugin ticket](./assets/bud-coder-create.png)
2. ![modify plugin ticket](./assets/bud-coder-modify.png)
3. ![settings](./assets/bud-coder-settings.png)
4. ![generate code](./assets/bud-coder-code-gen.png)
5. ![write to playground](./assets/bud-coder-write.png)

== Changelog ==

= 1.0.1 =
* Initial release.

== Upgrade Notice ==

= 1.0.1 =
First version of the plugin. No upgrades available yet.

