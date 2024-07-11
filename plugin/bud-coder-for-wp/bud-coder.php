<?php
/*
Plugin Name: BudCoder WP
Plugin URI: https://github.com/easychen/budcoder-in-wordpress
Description: Create, modify, and test WordPress plugins on the fly with AI
Author: easychen@gmail.com
Version: 1.0.5
Text Domain: bud-coder
Domain Path: /languages
License: GPLv2
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

if (! function_exists('WP_Filesystem')) {
    require_once(ABSPATH . 'wp-admin/includes/file.php');
}

// if( WP_Filesystem() )
// {
//     global $wp_filesystem;
// }

function pebc_get_wp_fs()
{
    if (! function_exists('WP_Filesystem')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }
    if(WP_Filesystem()) {
        global $wp_filesystem;
        return $wp_filesystem;
    }
}

function pebc__file_get_contents($file)
{
    global $wp_filesystem;
    return $wp_filesystem->get_contents($file);
    // return file_get_contents($file);
    // wp_remote_retrieve_body(wp_remote_get($source)));
}

class PluginEditorByBudCoder
{
    public function __construct()
    {
        add_action('admin_menu', array($this, 'add_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
        // 注册 ajax
        add_action('wp_ajax_pebc_create_ticket', array($this, 'create_ticket'));
        add_action('wp_ajax_pebc_get_tickets', array($this, 'get_tickets'));
        add_action('wp_ajax_pebc_delete_ticket', array($this, 'delete_ticket'));
        add_action('wp_ajax_pebc_delete_file', array($this, 'delete_file'));
        // 加载 i18n
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        // 注册 rest api(用于跨域下载zip包)
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function load_textdomain()
    {
        load_plugin_textdomain('bud-coder', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function register_rest_routes()
    {
        register_rest_route('pebc/v1', '/get-file/(?P<rand>[a-zA-Z0-9_-]+)/(?P<plugin>[a-zA-Z0-9_-]+)\.zip', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_file'),
            'permission_callback' => '__return_true', // Allow public access
        ));
    }

    // 注册后台菜单入口
    public function add_menu()
    {
        add_menu_page(
            __('BudCoder', 'bud-coder'),
            __('BudCoder', 'bud-coder'),
            'manage_options',
            'bud-coder',
            array($this, 'menu_page'),
            'dashicons-editor-code',
            6
        );
    }

    public function enqueue_scripts($hook)
    {
        // hook 参数由 add_menu_page 的参数拼接生成
        if ($hook != 'toplevel_page_bud-coder') {
            return;
        }
        wp_enqueue_script('pebc-script', plugins_url('/js/pebc-script.js', __FILE__), array('jquery'), null, true);
        wp_localize_script('pebc-script', 'pebc_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'plugin_url' => plugins_url('', __FILE__),
            'i18n' => array(
                'prompt_lang' => __('lang', 'bud-coder'),
                'prevent_default_form_submission_behavior' => __('Prevent default form submission behavior', 'bud-coder'),
                'ticket_created' => __('Ticket created', 'bud-coder'),
                'ticket_creation_failed' => __('Ticket creation failed', 'bud-coder'),
                'access_file' => __('Access file', 'bud-coder'),
                'delete_file' => __('Delete file', 'bud-coder'),
                'jump' => __('Jump', 'bud-coder'),
                'delete' => __('Delete', 'bud-coder'),
                'are_you_sure_you_want_to_delete_this_ticket' => __('Are you sure you want to delete this ticket?', 'bud-coder'),
                'ticket_deleted' => __('Ticket deleted', 'bud-coder'),
                'failed_to_delete_ticket' => __('Failed to delete ticket', 'bud-coder'),
                'failed_to_delete_file' => __('Failed to delete file', 'bud-coder'),
                'are_you_sure_you_want_to_delete_this_file' => __('Are you sure you want to delete this file?', 'bud-coder'),
                'file_deleted' => __('File deleted', 'bud-coder'),
            )
        ));
    }

    public function menu_page()
    {
        ?>
<div class="wrap">
	<h1>BudCoder WP</h1>
	<form id="pebc-form" class="pebc-form">
		<?php wp_nonce_field('pebc_form_action', 'pebc_form_nonce'); ?>
		<table class="form-table">
			<tr>
				<th scope="row"><label
						for="plugin-select"><?php esc_html_e('Select Plugin', 'bud-coder'); ?></label>
				</th>
				<td>
					<select id="plugin-select" name="plugin" class="regular-text">
						<option value="">
							<?php esc_html_e('New Plugin', 'bud-coder'); ?>
						</option>
						<?php
                        $plugins = get_plugins();
        foreach ($plugins as $plugin_file => $plugin_data) {
            echo '<option value="' . esc_attr($plugin_file) . '">' . esc_html($plugin_data['Name']) . '</option>';
        }
        ?>
					</select>
				</td>
			</tr>
			<tr>
				<th scope="row"><label
						for="ticket-request"><?php esc_html_e('Request', 'bud-coder'); ?></label>
				</th>
				<td>
					<textarea id="ticket-request" name="request" class="large-text" rows="4"></textarea>
				</td>
			</tr>
			<tr>
				<th scope="row"><input hidden name="page" value="bud-coder" /></th>
				<td>
					<p class="submit">
						<button type="submit"
							class="button button-primary"><?php esc_html_e('Submit Ticket', 'bud-coder'); ?></button>
					</p>
				</td>
			</tr>
		</table>
	</form>
	<h2><?php esc_html_e('All Tickets', 'bud-coder'); ?>
	</h2>
	<table id="pebc-tickets-table" class="wp-list-table widefat fixed striped">
		<thead>
			<tr>
				<th><?php esc_html_e('Plugin', 'bud-coder'); ?>
				</th>
				<th><?php esc_html_e('Request', 'bud-coder'); ?>
				</th>
				<th><?php esc_html_e('Created Time', 'bud-coder'); ?>
				</th>
				<th><?php esc_html_e('File Link', 'bud-coder'); ?>
				</th>
				<th><?php esc_html_e('Actions', 'bud-coder'); ?>
				</th>
			</tr>
		</thead>
		<tbody>
			<!-- 工单列表将通过AJAX填充 -->
		</tbody>
	</table>
</div>
<?php
    }

    public function create_ticket()
    {
        check_ajax_referer('pebc_form_action', 'pebc_form_nonce');

        global $wpdb;
        $wp_filesystem = pebc_get_wp_fs();
        $table_name = $wpdb->prefix . 'pebc_tickets';
        $plugin = sanitize_text_field($_POST['plugin']);
        $request = sanitize_textarea_field($_POST['request']);
        $time = current_time('mysql');

        if(strlen($plugin) > 1) {
            $plugin_dir = WP_PLUGIN_DIR . '/' . dirname($plugin);
            // 创建随机字符串目录
            $random_string = wp_generate_password(8, false);
            $zip_dir = plugin_dir_path(__FILE__) . 'zip/' . $random_string;



            if (! $wp_filesystem->is_dir($zip_dir)) {
                $wp_filesystem->mkdir($zip_dir, FS_CHMOD_DIR);
            }

            $zip_file = $zip_dir . '/' . sanitize_file_name(basename($plugin_dir)) . '.zip';
            $zip_short_file = str_replace(dirname(__FILE__).'/', '', $zip_file);
            $zip_url = plugins_url('zip/' . $random_string . '/' . basename($zip_file), __FILE__);

            $this->zip_plugin($plugin_dir, $zip_file);
        }

        $wpdb->insert($table_name, array(
            'plugin' => $plugin,
            'request' => $request,
            'time' => $time,
            'zip_file' => $zip_short_file ?? '' ,
            'zip_url' => $zip_url ?? ''
        ));

        wp_send_json_success();
    }

    private function zip_plugin($source, $destination)
    {
        if (!extension_loaded('zip') || !file_exists($source)) {
            return false;
        }

        $zip = new ZipArchive();
        if (!$zip->open($destination, ZIPARCHIVE::CREATE)) {
            return false;
        }

        $source = str_replace('\\', '/', realpath($source));
        if (is_dir($source) === true) {
            $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source), RecursiveIteratorIterator::SELF_FIRST);
            foreach ($files as $file) {
                $file = str_replace('\\', '/', $file);
                if (in_array(substr($file, strrpos($file, '/') + 1), array('.', '..'))) {
                    continue;
                }
                $file = realpath($file);
                if (is_dir($file) === true) {
                    $zip->addEmptyDir(str_replace($source . '/', '', $file . '/'));
                } elseif (is_file($file) === true) {
                    $zip->addFromString(str_replace($source . '/', '', $file), pebc__file_get_contents($file));
                }
            }
        } elseif (is_file($source) === true) {
            $zip->addFromString(basename($source), pebc__file_get_contents($source));
        }

        return $zip->close();
    }

    public function get_tickets()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'pebc_tickets';
        $tickets = $wpdb->get_results("SELECT * FROM $table_name ORDER BY time DESC");

        wp_send_json_success($tickets);
    }

    public function delete_ticket()
    {
        check_ajax_referer('pebc_form_action', 'pebc_form_nonce');
        $wp_filesystem = pebc_get_wp_fs();
        global $wpdb;
        $table_name = $wpdb->prefix . 'pebc_tickets';
        $ticket_id = intval($_POST['ticket_id']);
        $ticket = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $ticket_id));

        if ($ticket) {
            $file_path = str_replace(plugins_url('/', __FILE__), plugin_dir_path(__FILE__), $ticket->zip_url);
            if (file_exists($file_path)) {
                wp_delete_file($file_path);
                $file_dir = dirname($file_path);
                if ($wp_filesystem->is_dir($file_dir)) {
                    $wp_filesystem->rmdir($file_dir);
                }
            }
            $wpdb->delete($table_name, array('id' => $ticket_id));
            wp_send_json_success();
        } else {
            wp_send_json_error(__('Ticket does not exist', 'bud-coder'));
        }
    }

    public function delete_file()
    {
        check_ajax_referer('pebc_form_action', 'pebc_form_nonce');
        $wp_filesystem = pebc_get_wp_fs();

        $file_path = sanitize_text_field($_POST['file_path']);
        $file_path = str_replace(plugins_url('/', __FILE__), plugin_dir_path(__FILE__), $file_path);

        if (file_exists($file_path)) {
            if ($wp_filesystem->delete($file_path)) {
                // 尝试删除文件夹
                $file_dir = dirname($file_path);

                if ($wp_filesystem->is_dir($file_dir) && count($wp_filesystem->dirlist($file_dir)) == 0) { // 确保文件夹为空
                    $wp_filesystem->rmdir($file_dir);
                }
                wp_send_json_success();
            } else {
                wp_send_json_error(__('Failed to delete file', 'bud-coder'));
            }
        } else {
            wp_send_json_error(__('File does not exist', 'bud-coder'));
        }
    }

    public function get_file(WP_REST_Request $request)
    {
        $wp_filesystem = pebc_get_wp_fs();
        // 设置CORS头
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET');
        header('Access-Control-Allow-Headers: Content-Type');

        // 获取文件路径
        $rand = sanitize_text_field($request->get_param('rand'));
        $plugin = sanitize_text_field($request->get_param('plugin'));

        $file_path = dirname(__FILE__) . '/zip/' . basename($rand) . '/' . basename($plugin) . '.zip';

        // 输出文件内容
        if (file_exists($file_path)) {
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . basename($plugin) . '.zip"');
            // $wp_filesystem->readfile($file_path);
            echo $wp_filesystem->get_contents($file_path);
            exit;
        } else {
            wp_send_json_error(__('File does not exist', 'bud-coder'));
        }
    }
}

new PluginEditorByBudCoder();

// 创建数据库表
register_activation_hook(__FILE__, 'pebc_create_db');

function pebc_create_db()
{
    global $wpdb;
    $table_name = $wpdb->prefix . 'pebc_tickets';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        plugin varchar(255) NOT NULL,
        request text NOT NULL,
        time datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
        zip_file varchar(255) NOT NULL,
        zip_url varchar(255) NOT NULL,
        PRIMARY KEY  (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
?>