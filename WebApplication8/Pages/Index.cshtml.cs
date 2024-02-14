using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;

namespace WebApplication8.Pages
{
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;

        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }

        //public IActionResult OnPost()
        //{
        //    return Content("Hello world!");
        //}

        public JsonResult OnPost([FromBody] IndexViewModel json)
        {
            return new JsonResult(json);
        }

        public JsonResult OnPostTest([FromBody] IndexViewModel json)
        {
            return new JsonResult(json);
        }
    }

    public class IndexViewModel
    {
        public string name { get; set; }
        public string lastname { get; set; }
    }
}